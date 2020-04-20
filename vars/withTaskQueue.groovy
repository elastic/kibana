import groovy.transform.Field

public static @Field TASK_QUEUES = [:]
public static @Field TASK_QUEUES_COUNTER = 0

def call(Map options = [:], Closure closure) {
  def config = [ parallel: 10 ] + options
  def counter = ++TASK_QUEUES_COUNTER

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
                    if (processesExecuting < 1 && getTasks().isEmpty()) {
                      taskNotify()
                    }
                    return
                  }

                  if (processesExecuting > 0) {
                    taskSleep()
                    return
                  }

                  // taskNotify()
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
      fi
    done
  """, label: "Waiting for new tasks...")
}

def addTask(Closure closure) {
  getTasks() << closure
  taskNotify()
}

def getTasks() {
  return withTaskQueue.TASK_QUEUES[env.TASK_QUEUE_ID].tasks
}

def getTmpFile() {
  return withTaskQueue.TASK_QUEUES[env.TASK_QUEUE_ID].tmpFile
}

def taskNotify() {
  sh "touch '${getTmpFile()}'"
}

def addTasks(List<Closure> closures) {
  closures.reverse().each {
    getTasks() << it
  }
  taskNotify()
}
