// "Workers" in this file will spin up an instance, do some setup etc depending on the configuration, and then execute some work that you define
// e.g. workers.base(name: 'my-worker') { sh "echo 'ready to execute some kibana scripts'" }

def label(size) {
  switch(size) {
    case 'flyweight':
      return 'flyweight'
    case 's':
      return 'docker && linux && immutable'
    case 's-highmem':
      return 'docker && tests-s'
    case 'l':
      return 'docker && tests-l'
    case 'xl':
      return 'docker && tests-xl'
    case 'xxl':
      return 'docker && tests-xxl'
  }

  error "unknown size '${size}'"
}

/*
  The base worker that all of the others use. Will clone the scm (assumed to be kibana), and run kibana bootstrap processes by default.

  Parameters:
    size - size of worker label to use, e.g. 's' or 'xl'
    ramDisk - Should the workspace be mounted in memory? Default: true
    bootstrapped - If true, download kibana dependencies, run kbn bootstrap, etc. Default: true
    name - Name of the worker for display purposes, filenames, etc.
    scm - Jenkins scm configuration for checking out code. Use `null` to disable checkout. Default: inherited from job
*/
def base(Map params, Closure closure) {
  def config = [size: '', ramDisk: true, bootstrapped: true, name: 'unnamed-worker', scm: scm] + params
  if (!config.size) {
    error "You must specify an agent size, such as 'xl' or 's', when using workers.base()"
  }

  node(label(config.size)) {
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

    def checkoutInfo = [:]

    if (config.scm) {
      // Try to clone from Github up to 8 times, waiting 15 secs between attempts
      retryWithDelay(8, 15) {
        checkout scm
      }

      dir("kibana") {
        checkoutInfo = getCheckoutInfo()

        // use `checkoutInfo` as a flag to indicate that we've already reported the pending commit status
        if (buildState.get('shouldSetCommitStatus') && !buildState.has('checkoutInfo')) {
          buildState.set('checkoutInfo', checkoutInfo)
          githubCommitStatus.onStart()
        }
      }

      ciStats.reportGitInfo(
        checkoutInfo.branch,
        checkoutInfo.commit,
        checkoutInfo.targetBranch,
        checkoutInfo.mergeBase
      )
    }

    withEnv([
      "CI=true",
      "HOME=${env.JENKINS_HOME}",
      "PR_SOURCE_BRANCH=${env.ghprbSourceBranch ?: ''}",
      "PR_TARGET_BRANCH=${env.ghprbTargetBranch ?: ''}",
      "PR_AUTHOR=${env.ghprbPullAuthorLogin ?: ''}",
      "TEST_BROWSER_HEADLESS=1",
      "GIT_BRANCH=${checkoutInfo.branch}",
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
    ci(name: jobName, size: 's-highmem', ramDisk: true) {
      withEnv(["JOB=${jobName}"]) {
        runbld(script, "Execute ${jobName}")
      }
    }
  }
}

// Worker for running functional tests. Runs a setup process (e.g. the kibana build) then executes a map of closures in parallel (e.g. one for each ciGroup)
def functional(name, Closure setup, Map processes) {
  return {
    parallelProcesses(name: name, setup: setup, processes: processes, delayBetweenProcesses: 20, size: 'xl')
  }
}

/*
  Creates a ci worker that can run a setup process, followed by a group of processes in parallel.

  Parameters:
    name: Name of the worker for display purposes, filenames, etc.
    setup: Closure to execute after the agent is bootstrapped, before starting the parallel work
    processes: Map of closures that will execute in parallel after setup. Each closure is passed a unique number.
    delayBetweenProcesses: Number of seconds to wait between starting the parallel processes. Useful to spread the load of heavy init processes, e.g. Elasticsearch starting up. Default: 0
    size: size of worker label to use, e.g. 's' or 'xl'
*/
def parallelProcesses(Map params) {
  def config = [name: 'parallel-worker', setup: {}, processes: [:], delayBetweenProcesses: 0, size: 'xl'] + params

  ci(size: config.size, name: config.name) {
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
