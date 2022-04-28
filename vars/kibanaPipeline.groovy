def withPostBuildReporting(Map params, Closure closure) {
  try {
    closure()
  } finally {
    def parallelWorkspaces = []
    try {
      parallelWorkspaces = getParallelWorkspaces()
    } catch(ex) {
      print ex
    }

    if (params.runErrorReporter) {
      catchErrors {
        runErrorReporter([pwd()] + parallelWorkspaces)
      }
    }

    catchErrors {
      publishJunit()
    }

    catchErrors {
      def parallelWorkspace = "${env.WORKSPACE}/parallel"
      if (fileExists(parallelWorkspace)) {
        dir(parallelWorkspace) {
          def workspaceTasks = [:]

          parallelWorkspaces.each { workspaceDir ->
            workspaceTasks[workspaceDir] = {
              dir(workspaceDir) {
                catchErrors {
                  runbld.junit()
                }
              }
            }
          }

          if (workspaceTasks) {
            parallel(workspaceTasks)
          }
        }
      }
    }
  }
}

def getParallelWorkspaces() {
  def workspaces = []
  def parallelWorkspace = "${env.WORKSPACE}/parallel"
  if (fileExists(parallelWorkspace)) {
    dir(parallelWorkspace) {
      // findFiles only returns files if you use glob, so look for a file that should be in every valid workspace
      workspaces = findFiles(glob: '*/kibana/package.json')
        .collect {
          // get the paths to the kibana directories for the parallel workspaces
          return parallelWorkspace + '/' + it.path.tokenize('/').dropRight(1).join('/')
        }
    }
  }

  return workspaces
}

def notifyOnError(Closure closure) {
  try {
    closure()
  } catch (ex) {
    // If this is the first failed step, it's likely that the error hasn't propagated up far enough to mark the build as a failure
    currentBuild.result = 'FAILURE'
    catchErrors {
      githubPr.sendComment(false)
    }
    catchErrors {
      // an empty map is a valid config, but is falsey, so let's use .has()
      if (buildState.has('SLACK_NOTIFICATION_CONFIG')) {
        slackNotifications.sendFailedBuild(buildState.get('SLACK_NOTIFICATION_CONFIG'))
      }
    }
    throw ex
  }
}

def withFunctionalTestEnv(List additionalEnvs = [], Closure closure) {
  // This can go away once everything that uses the deprecated workers.parallelProcesses() is moved to task queue
  def parallelId = env.TASK_QUEUE_PROCESS_ID ?: env.CI_PARALLEL_PROCESS_NUMBER

  def kibanaPort = "61${parallelId}1"
  def esPort = "62${parallelId}1"
  // Ports 62x2-62x9 kept open for ES nodes
  def esTransportPort = "63${parallelId}1-63${parallelId}9"
  def fleetPackageRegistryPort = "64${parallelId}1"
  def alertingProxyPort = "64${parallelId}2"
  def corsTestServerPort = "64${parallelId}3"
  // needed for https://github.com/elastic/kibana/issues/107246
  def proxyTestServerPort = "64${parallelId}4"
  def contextPropagationOnly = githubPr.isPr() ? "true" : "false"

  withEnv([
    "CI_GROUP=${parallelId}",
    "REMOVE_KIBANA_INSTALL_DIR=1",
    "CI_PARALLEL_PROCESS_NUMBER=${parallelId}",
    "TEST_KIBANA_HOST=localhost",
    "TEST_KIBANA_PORT=${kibanaPort}",
    "TEST_KIBANA_URL=http://elastic:changeme@localhost:${kibanaPort}",
    "TEST_ES_URL=http://elastic:changeme@localhost:${esPort}",
    "TEST_ES_TRANSPORT_PORT=${esTransportPort}",
    "TEST_CORS_SERVER_PORT=${corsTestServerPort}",
    "TEST_PROXY_SERVER_PORT=${proxyTestServerPort}",
    "KBN_NP_PLUGINS_BUILT=true",
    "FLEET_PACKAGE_REGISTRY_PORT=${fleetPackageRegistryPort}",
    "ALERTING_PROXY_PORT=${alertingProxyPort}",
    "ELASTIC_APM_ACTIVE=true",
    "ELASTIC_APM_CONTEXT_PROPAGATION_ONLY=${contextPropagationOnly}",
    "ELASTIC_APM_TRANSACTION_SAMPLE_RATE=0.1",
  ] + additionalEnvs) {
    closure()
  }
}

def functionalTestProcess(String name, Closure closure) {
  return {
    notifyOnError {
      withFunctionalTestEnv(["JOB=${name}"], closure)
    }
  }
}

def functionalTestProcess(String name, String script) {
  return functionalTestProcess(name) {
    retryable(name) {
      runbld(script, "Execute ${name}")
    }
  }
}

def ossCiGroupProcess(ciGroup, withDelay = false) {
  return functionalTestProcess("ciGroup" + ciGroup) {
    if (withDelay && !(ciGroup instanceof String) && !(ciGroup instanceof GString)) {
      sleep((ciGroup-1)*30) // smooth out CPU spikes from ES startup
    }

    withEnv([
      "CI_GROUP=${ciGroup}",
      "JOB=kibana-ciGroup${ciGroup}",
    ]) {
      retryable("kibana-ciGroup${ciGroup}") {
        runbld("./test/scripts/jenkins_ci_group.sh", "Execute kibana-ciGroup${ciGroup}")
      }
    }
  }
}

def xpackCiGroupProcess(ciGroup, withDelay = false) {
  return functionalTestProcess("xpack-ciGroup" + ciGroup) {
    if (withDelay && !(ciGroup instanceof String) && !(ciGroup instanceof GString)) {
      sleep((ciGroup-1)*30) // smooth out CPU spikes from ES startup
    }
    withEnv([
      "CI_GROUP=${ciGroup}",
      "JOB=xpack-kibana-ciGroup${ciGroup}",
    ]) {
      retryable("xpack-kibana-ciGroup${ciGroup}") {
        runbld("./test/scripts/jenkins_xpack_ci_group.sh", "Execute xpack-kibana-ciGroup${ciGroup}")
      }
    }
  }
}

def uploadGcsArtifact(uploadPrefix, pattern) {
  googleStorageUpload(
    credentialsId: 'kibana-ci-gcs-plugin',
    bucket: "gs://${uploadPrefix}",
    pattern: pattern,
    sharedPublicly: true,
    showInline: true,
  )
}

def withGcsArtifactUpload(workerName, closure) {
  def uploadPrefix = "kibana-ci-artifacts/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/${workerName}"
  def ARTIFACT_PATTERNS = [
    'target/junit/**/*',
    'target/kibana-*',
    'target/kibana-coverage/jest/**/*',
    'target/kibana-security-solution/**/*.png',
    'target/test-metrics/*',
    'target/test-suites-ci-plan.json',
    'test/**/screenshots/diff/*.png',
    'test/**/screenshots/failure/*.png',
    'test/**/screenshots/session/*.png',
    'test/functional/failure_debug/html/*.html',
    'x-pack/test/**/screenshots/diff/*.png',
    'x-pack/test/**/screenshots/failure/*.png',
    'x-pack/test/**/screenshots/session/*.png',
    'x-pack/test/functional/failure_debug/html/*.html',
    '.es/**/*.hprof'
  ]

  withEnv([
    "GCS_UPLOAD_PREFIX=${uploadPrefix}"
  ], {
    try {
      closure()
    } finally {
      catchErrors {
        ARTIFACT_PATTERNS.each { pattern ->
          uploadGcsArtifact(uploadPrefix, pattern)
        }

        dir(env.WORKSPACE) {
          ARTIFACT_PATTERNS.each { pattern ->
            uploadGcsArtifact(uploadPrefix, "parallel/*/kibana/${pattern}")
          }
        }
      }
    }
  })
}

def publishJunit() {
  junit(testResults: 'target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)

  dir(env.WORKSPACE) {
    junit(testResults: 'parallel/*/kibana/target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)
  }
}

def sendMail(Map params = [:]) {
  // If the build doesn't have a result set by this point, there haven't been any errors and it can be marked as a success
  // The e-mail plugin for the infra e-mail depends upon this being set
  currentBuild.result = currentBuild.result ?: 'SUCCESS'

  def buildStatus = buildUtils.getBuildStatus()
  if (buildStatus != 'SUCCESS' && buildStatus != 'ABORTED') {
    node('flyweight') {
      sendInfraMail()
      sendKibanaMail(params)
    }
  }
}

def sendInfraMail() {
  catchErrors {
    step([
      $class: 'Mailer',
      notifyEveryUnstableBuild: true,
      recipients: 'infra-root+build@elastic.co',
      sendToIndividuals: false
    ])
  }
}

def sendKibanaMail(Map params = [:]) {
  def config = [to: 'build-kibana@elastic.co'] + params

  catchErrors {
    def buildStatus = buildUtils.getBuildStatus()
    if(params.NOTIFY_ON_FAILURE && buildStatus != 'SUCCESS' && buildStatus != 'ABORTED') {
      emailext(
        config.to,
        subject: "${env.JOB_NAME} - Build # ${env.BUILD_NUMBER} - ${buildStatus}",
        body: '${SCRIPT,template="groovy-html.template"}',
        mimeType: 'text/html',
      )
    }
  }
}

def bash(script, label) {
  sh(
    script: "#!/bin/bash\n${script}",
    label: label
  )
}

def doSetup() {
  notifyOnError {
    retryWithDelay(2, 15) {
      try {
        runbld("./test/scripts/jenkins_setup.sh", "Setup Build Environment and Dependencies")
      } catch (ex) {
        try {
          // Setup expects this directory to be missing, so we need to remove it before we do a retry
          bash("rm -rf ../elasticsearch", "Remove elasticsearch sibling directory, if it exists")
        } finally {
          throw ex
        }
      }
    }
  }
}

def getBuildArtifactBucket() {
  def dir = env.ghprbPullId ? "pr-${env.ghprbPullId}" : buildState.get('checkoutInfo').branch.replace("/", "__")
  return "gs://ci-artifacts.kibana.dev/default-build/${dir}/${buildState.get('checkoutInfo').commit}"
}

def buildKibana(maxWorkers = '') {
  notifyOnError {
    withEnv(["KBN_OPTIMIZER_MAX_WORKERS=${maxWorkers}"]) {
      runbld("./test/scripts/jenkins_build_kibana.sh", "Build Kibana")
    }

    withGcpServiceAccount.fromVaultSecret('secret/kibana-issues/dev/ci-artifacts-key', 'value') {
      bash("""
        cd "${env.WORKSPACE}"
        gsutil -q -m cp 'kibana-default.tar.gz' '${getBuildArtifactBucket()}/'
        gsutil -q -m cp 'kibana-default-plugins.tar.gz' '${getBuildArtifactBucket()}/'
      """, "Upload Default Build artifacts to GCS")
    }
  }
}

def downloadDefaultBuildArtifacts() {
  withGcpServiceAccount.fromVaultSecret('secret/kibana-issues/dev/ci-artifacts-key', 'value') {
    bash("""
      cd "${env.WORKSPACE}"
      gsutil -q -m cp '${getBuildArtifactBucket()}/kibana-default.tar.gz' ./
      gsutil -q -m cp '${getBuildArtifactBucket()}/kibana-default-plugins.tar.gz' ./
    """, "Download Default Build artifacts from GCS")
  }
}

def runErrorReporter() {
  return runErrorReporter([pwd()])
}

def runErrorReporter(workspaces) {
  def status = buildUtils.getBuildStatus()
  def dryRun = status != "ABORTED" ? "" : "--no-github-update"

  def globs = workspaces.collect { "'${it}/target/junit/**/*.xml'" }.join(" ")

  bash(
    """
      source src/dev/ci_setup/setup_env.sh
      node scripts/report_failed_tests --no-index-errors ${dryRun} ${globs}
    """,
    "Report failed tests, if necessary"
  )
}

def call(Map params = [:], Closure closure) {
  def config = [timeoutMinutes: 135, checkPrChanges: false, setCommitStatus: false] + params

  stage("Kibana Pipeline") {
    timeout(time: config.timeoutMinutes, unit: 'MINUTES') {
      timestamps {
        ansiColor('xterm') {
          if (config.setCommitStatus) {
            buildState.set('shouldSetCommitStatus', true)
          }
          if (config.checkPrChanges && githubPr.isPr()) {
            pipelineLibraryTests()

            print "Checking PR for changes to determine if CI needs to be run..."

            if (prChanges.areChangesSkippable()) {
              print "No changes requiring CI found in PR, skipping."
              return
            }
          }
          try {
            closure()
          } finally {
            if (config.setCommitStatus) {
              githubCommitStatus.onFinish()
            }
          }
        }
      }
    }
  }
}

// Creates a task queue using withTaskQueue, and copies the bootstrapped kibana repo into each process's workspace
// Note that node_modules are mostly symlinked to save time/space. See test/scripts/jenkins_setup_parallel_workspace.sh
def withCiTaskQueue(Map options = [:], Closure closure) {
  def setupClosure = {
    // This can't use runbld, because it expects the source to be there, which isn't yet
    bash("${env.WORKSPACE}/kibana/test/scripts/jenkins_setup_parallel_workspace.sh", "Set up duplicate workspace for parallel process")
  }

  def config = [parallel: 24, setup: setupClosure] + options

  withTaskQueue(config) {
    closure.call()
  }
}

def scriptTask(description, script) {
  return {
    withFunctionalTestEnv {
      notifyOnError {
        runbld(script, description)
      }
    }
  }
}

def scriptTaskDocker(description, script) {
  return {
    withDocker(scriptTask(description, script))
  }
}

def buildDocker() {
  sh(
    script: "./.ci/build_docker.sh",
    label: 'Build CI Docker image'
  )
}

def withDocker(Closure closure) {
  docker
    .image('kibana-ci')
    .inside(
      "-v /etc/runbld:/etc/runbld:ro -v '${env.JENKINS_HOME}:${env.JENKINS_HOME}' -v '/dev/shm/workspace:/dev/shm/workspace' --shm-size 2GB --cpus 4",
      closure
    )
}

def buildPlugins() {
  runbld('./test/scripts/jenkins_build_plugins.sh', 'Build OSS Plugins')
}

def withTasks(Map params = [:], Closure closure) {
  catchErrors {
    def config = [setupWork: {}, worker: [:], parallel: 24] + params
    def workerConfig = [name: 'ci-worker', size: 'xxl', ramDisk: true] + config.worker

    workers.ci(workerConfig) {
      withCiTaskQueue([parallel: config.parallel]) {
        parallel([
          docker: {
            retry(2) {
              buildDocker()
            }
          },

          // There are integration tests etc that require the plugins to be built first, so let's go ahead and build them before set up the parallel workspaces
          plugins: { buildPlugins() },
        ])

        config.setupWork()

        catchErrors {
          closure()
        }
      }
    }
  }
}

def allCiTasks() {
  parallel([
    general: {
      withTasks {
        tasks.check()
        tasks.lint()
        tasks.test()
        task {
          buildKibana(16)
          tasks.functionalOss()
          tasks.functionalXpack()
        }
        tasks.storybooksCi()
      }
    },
    jest: {
      workers.ci(name: 'jest', size: 'n2-standard-16', ramDisk: false) {
        catchErrors {
          scriptTask('Jest Unit Tests', 'test/scripts/test/jest_unit.sh')()
        }

        catchErrors {
          runbld.junit()
        }
      }
    },
  ])
}

def pipelineLibraryTests() {
  return
  whenChanged(['vars/', '.ci/pipeline-library/']) {
    workers.base(size: 'flyweight', bootstrapped: false, ramDisk: false) {
      dir('.ci/pipeline-library') {
        sh './gradlew test'
      }
    }
  }
}

return this
