import groovy.transform.Field

public static @Field TASK_QUEUES = [:]
public static @Field TASK_QUEUES_COUNTER = 0

/**
  withTaskQueue creates a queue of "tasks" (just plain closures to execute), and executes them with your desired level of concurrency.
  This way, you can define, for example, 40 things that need to execute, then only allow 10 of them to execute at once.

  Each "process" will execute in a separate, unique, empty directory.
  If you want each process to have a bootstrapped kibana repo, check out kibanaPipeline.withCiTaskQueue

  Using the queue currently requires an agent/worker.

  Usage:

  withTaskQueue(parallel: 10) {
    task { print "This is a task" }

    // This is the same as calling task() multiple times
    tasks([ { print "Another task" }, { print "And another task" } ])

    // Tasks can queue up subsequent tasks
    task {
      buildThing()
      task { print "I depend on buildThing()" }
    }
  }

  You can also define a setup task that each process should execute one time before executing tasks:
  withTaskQueue(parallel: 10, setup: { sh "my-setup-scrupt.sh" }) {
    ...
  }

*/
def call(Map options = [:], Closure closure) {
  def config = [ parallel: 10 ] + options
  def counter = ++TASK_QUEUES_COUNTER

  // We're basically abusing withEnv() to create a "scope" for all steps inside of a withTaskQueue block
  // This way, we could have multiple task queue instances in the same pipeline
  withEnv(["TASK_QUEUE_ID=${counter}"]) {
    withTaskQueue.TASK_QUEUES[env.TASK_QUEUE_ID] = [
      tasks: [],
      tmpFile: sh(script: 'mktemp', returnStdout: true).trim()
    ]

    closure.call()

    def processesExecuting = 0
    def processes = [:]
    def iterationId = 0

    for(def i = 1; i <= config.parallel; i++) {
      def j = i
      processes["task-queue-process-${j}"] = {
        catchErrors {
          withEnv([
            "TASK_QUEUE_PROCESS_ID=${j}",
            "TASK_QUEUE_ITERATION_ID=${++iterationId}"
          ]) {
            dir("${WORKSPACE}/parallel/${j}/kibana") {
              if (config.setup) {
                config.setup.call(j)
              }

              def isDone = false
              while(!isDone) { // TODO some kind of timeout?
                catchErrors {
                  if (!getTasks().isEmpty()) {
                    processesExecuting++
                    catchErrors {
                      def task
                      try {
                        task = getTasks().pop()
                      } catch (java.util.NoSuchElementException ex) {
                        return
                      }

                      task.call()
                    }
                    processesExecuting--
                    // If a task finishes, and no new tasks were queued up, and nothing else is executing
                    // Then all of the processes should wake up and exit
                    if (processesExecuting < 1 && getTasks().isEmpty()) {
                      taskNotify()
                    }
                    return
                  }

                  if (processesExecuting > 0) {
                    taskSleep()
                    return
                  }

                  // Queue is empty, no processes are executing
                  isDone = true
                }
              }
            }
          }
        }
      }
    }
    parallel(processes)
  }
}

// If we sleep in a loop using Groovy code, Pipeline Steps is flooded with Sleep steps
// So, instead, we just watch a file and `touch` it whenever something happens that could modify the queue
// There's a 20 minute timeout just in case something goes wrong,
//    in which case this method will get called again if the process is actually supposed to be waiting.
def taskSleep() {
  sh(script: """#!/bin/bash
    TIMESTAMP=\$(date '+%s' -d "0 seconds ago")
    for (( i=1; i<=240; i++ ))
    do
      if [ "\$(stat -c %Y '${getTmpFile()}')" -ge "\$TIMESTAMP" ]
      then
        break
      else
        sleep 5
        if [[ \$i == 240 ]]; then
          echo "Waited for new tasks for 20 minutes, exiting in case something went wrong"
        fi
      fi
    done
  """, label: "Waiting for new tasks...")
}

// Used to let the task queue processes know that either a new task has been queued up, or work is complete
def taskNotify() {
  sh "touch '${getTmpFile()}'"
}

def getTasks() {
  return withTaskQueue.TASK_QUEUES[env.TASK_QUEUE_ID].tasks
}

def getTmpFile() {
  return withTaskQueue.TASK_QUEUES[env.TASK_QUEUE_ID].tmpFile
}

def addTask(Closure closure) {
  getTasks() << closure
  taskNotify()
}

def addTasks(List<Closure> closures) {
  closures.reverse().each {
    getTasks() << it
  }
  taskNotify()
}
