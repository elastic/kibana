def base(Map params, Closure closure) {
  def config = [label: '', ramDisk: true, bootstrapped: true, name: 'unnamed-worker', scm: scm] + params
  if (!config.label) {
    error "You must specify an agent label, such as 'tests-xl' or 'linux && immutable', when using withWorker()"
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

def ci(Map params, Closure closure) {
  def config = [ramDisk: true, bootstrapped: true] + params

  return base(config) {
    kibanaPipeline.withGcsArtifactUpload(config.name) {
      kibanaPipeline.withPostBuildReporting {
        withEnv([
          "JOB=${config.name}"
        ]) {
          closure()
        }
      }
    }
  }
}

def intake(jobName, String script) {
  return {
    ci(name: jobName, label: 'linux && immutable') {
      runbld(script, "Execute ${jobName}")
    }
  }
}

def functional(name, Closure setup, Map processes) {
  return {
    parallelProcesses(name: name, setup: setup, processes: processes, delayBetweenProcesses: 20, label: 'tests-xl')
  }
}

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

        withEnv(["JOB=${processName}"]) {
          processClosure(processNumber)
        }
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
