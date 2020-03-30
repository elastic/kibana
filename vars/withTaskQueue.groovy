def call(Map options = [:], Closure closure) {
  def config = [ parallel: 10 ] + options

  def queue = []
  this.getTaskQueue = { queue }

  def tmpFile = sh(script: 'mktemp', returnStdout: true).trim()
  this.getTmpFile = { tmpFile }

  closure.delegate = this
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

          // sh "rm -rf ${WORKSPACE}/parallel/${j}" // TODO
          dir("${WORKSPACE}/parallel/${j}") {
            if (config.setup) {
              config.setup.call(j)
            }

            def isDone = false
            while(!isDone) { // TODO some kind of timeout?
              catchErrors {
                if (!queue.isEmpty()) {
                  processesExecuting++
                  catchErrors {
                    def task = queue.removeAt(0)
                    task.call()
                  }
                  processesExecuting--
                  if (processesExecuting < 1 && queue.isEmpty()) {
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

def task(Closure closure) {
  def queue = getTaskQueue()
  queue << closure
  taskNotify()
}

def taskNotify() {
  sh "touch '${getTmpFile()}'"
}

def tasks(List<Closure> closures) {
  closures.each {
    def queue = getTaskQueue()
    queue << it
  }
  taskNotify()
}
