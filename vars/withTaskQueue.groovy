def withTaskQueue(Map options = [:], Closure closure) {
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
      env.TASK_QUEUE_PROCESS_ID = j
      env.TASK_QUEUE_ITERATION_ID = ++iterationId

      dir("${WORKSPACE}/parallel/${processNumber}") {
        if (config.setup) {
          config.setup.call(j)
        }

        while(true) {
          if (!queue.isEmpty()) {
            processesExecuting++
            try {
              def task = queue.removeAt(0)
              task.call()
            } catch (ex) {
              print ex.toString()
            }
            processesExecuting--
            if (processesExecuting < 1 && queue.isEmpty()) {
              taskNotify()
            }
            continue
          }

          if (processesExecuting > 0) {
            taskSleep()
            continue
          }

          // taskNotify()
          break
        }
      }
    }
  }

  parallel(processes)
}

def taskSleep() {
  sh """#!/bin/bash
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
  """
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
