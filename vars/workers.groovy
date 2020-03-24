// "Workers" in this file will spin up an instance, do some setup etc depending on the configuration, and then execute some work that you define
// e.g. workers.base(name: 'my-worker') { sh "echo 'ready to execute some kibana scripts'" }

/*
  The base worker that all of the others use. Will clone the scm (assumed to be kibana), and run kibana bootstrap processes by default.

  Parameters:
    label - gobld/agent label to use, e.g. 'linux && immutable'
    ramDisk - Should the workspace be mounted in memory? Default: true
    bootstrapped - If true, download kibana dependencies, run kbn bootstrap, etc. Default: true
    name - Name of the worker for display purposes, filenames, etc.
    scm - Jenkins scm configuration for checking out code. Use `null` to disable checkout. Default: inherited from job
*/
def base(Map params, Closure closure) {
  def config = [label: '', ramDisk: true, bootstrapped: true, name: 'unnamed-worker', scm: scm] + params
  if (!config.label) {
    error "You must specify an agent label, such as 'tests-xl' or 'linux && immutable', when using workers.base()"
  }

  node(config.label) {
    agentInfo.print()

    if (config.ramDisk) {
      // Move to a temporary workspace, so that we can symlink the real workspace into /dev/shm
      def originalWorkspace = env.WORKSPACE
      ws('/tmp/workspace') {
        sh(
          script: """
            mkdir -p /dev/shm/workspace
            mkdir -p '${originalWorkspace}' # create all of the directories leading up to the workspace, if they don't exist
            rm --preserve-root -rf '${originalWorkspace}' # then remove just the workspace, just in case there's stuff in it
            ln -s /dev/shm/workspace '${originalWorkspace}'
          """,
          label: "Move workspace to RAM - /dev/shm/workspace"
        )
      }
    }

    def scmVars = [:]

    if (config.scm) {
      // Try to clone from Github up to 8 times, waiting 15 secs between attempts
      retryWithDelay(8, 15) {
        scmVars = checkout scm
      }
    }

    withEnv([
      "CI=true",
      "HOME=${env.JENKINS_HOME}",
      "PR_SOURCE_BRANCH=${env.ghprbSourceBranch ?: ''}",
      "PR_TARGET_BRANCH=${env.ghprbTargetBranch ?: ''}",
      "PR_AUTHOR=${env.ghprbPullAuthorLogin ?: ''}",
      "TEST_BROWSER_HEADLESS=1",
      "GIT_BRANCH=${scmVars.GIT_BRANCH ?: ''}",
    ]) {
      withCredentials([
        string(credentialsId: 'vault-addr', variable: 'VAULT_ADDR'),
        string(credentialsId: 'vault-role-id', variable: 'VAULT_ROLE_ID'),
        string(credentialsId: 'vault-secret-id', variable: 'VAULT_SECRET_ID'),
      ]) {
        // scm is configured to check out to the ./kibana directory
        dir('kibana') {
          if (config.bootstrapped) {
            kibanaPipeline.doSetup()
          }

          closure()
        }
      }
    }
  }
}

// Worker for ci processes. Extends the base worker and adds GCS artifact upload, error reporting, junit processing
def ci(Map params, Closure closure) {
  def config = [ramDisk: true, bootstrapped: true] + params

  return base(config) {
    kibanaPipeline.withGcsArtifactUpload(config.name) {
      kibanaPipeline.withPostBuildReporting {
        closure()
      }
    }
  }
}

// Worker for running the current intake jobs. Just runs a single script after bootstrap.
def intake(jobName, String script) {
  return {
    ci(name: jobName, label: 'linux && immutable', ramDisk: false) {
      withEnv(["JOB=${jobName}"]) {
        runbld(script, "Execute ${jobName}")
      }
    }
  }
}

// Worker for running functional tests. Runs a setup process (e.g. the kibana build) then executes a map of closures in parallel (e.g. one for each ciGroup)
def functional(name, Closure setup, Map processes) {
  return {
    parallelProcesses(name: name, setup: setup, processes: processes, delayBetweenProcesses: 20, label: 'tests-xl')
  }
}

/*
  Creates a ci worker that can run a setup process, followed by a group of processes in parallel.

  Parameters:
    name: Name of the worker for display purposes, filenames, etc.
    setup: Closure to execute after the agent is bootstrapped, before starting the parallel work
    processes: Map of closures that will execute in parallel after setup. Each closure is passed a unique number.
    delayBetweenProcesses: Number of seconds to wait between starting the parallel processes. Useful to spread the load of heavy init processes, e.g. Elasticsearch starting up. Default: 0
    label: gobld/agent label to use, e.g. 'linux && immutable'. Default: 'tests-xl', a 32 CPU machine used for running many functional test suites in parallel
*/
def parallelProcesses(Map params) {
  def config = [name: 'parallel-worker', setup: {}, processes: [:], delayBetweenProcesses: 0, label: 'tests-xl'] + params

  ci(label: config.label, name: config.name) {
    config.setup()

    def nextProcessNumber = 1
    def process = { processName, processClosure ->
      def processNumber = nextProcessNumber
      nextProcessNumber++

      return {
        if (config.delayBetweenProcesses && config.delayBetweenProcesses > 0) {
          // This delay helps smooth out CPU load caused by ES/Kibana instances starting up at the same time
          def delay = (processNumber-1)*config.delayBetweenProcesses
          sleep(delay)
        }

        processClosure(processNumber)
      }
    }

    def processes = [:]
    config.processes.each { processName, processClosure ->
      processes[processName] = process(processName, processClosure)
    }

    parallel(processes)
  }
}

return this
