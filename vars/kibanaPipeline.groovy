def withPostBuildReporting(Closure closure) {
  try {
    closure()
  } finally {
    def parallelWorkspaces = []
    try {
      parallelWorkspaces = getParallelWorkspaces()
    } catch(ex) {
      print ex
    }

    catchErrors {
      runErrorReporter([pwd()] + parallelWorkspaces)
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
  def esPort = "61${parallelId}2"
  def esTransportPort = "61${parallelId}3"
  def ingestManagementPackageRegistryPort = "61${parallelId}4"
  def alertingProxyPort = "61${parallelId}5"

  withEnv([
    "CI_GROUP=${parallelId}",
    "REMOVE_KIBANA_INSTALL_DIR=1",
    "CI_PARALLEL_PROCESS_NUMBER=${parallelId}",
    "TEST_KIBANA_HOST=localhost",
    "TEST_KIBANA_PORT=${kibanaPort}",
    "TEST_KIBANA_URL=http://elastic:changeme@localhost:${kibanaPort}",
    "TEST_ES_URL=http://elastic:changeme@localhost:${esPort}",
    "TEST_ES_TRANSPORT_PORT=${esTransportPort}",
    "KBN_NP_PLUGINS_BUILT=true",
    "INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=${ingestManagementPackageRegistryPort}",
    "ALERTING_PROXY_PORT=${alertingProxyPort}"
  ] + additionalEnvs) {
    closure()
  }
}

def functionalTestProcess(String name, Closure closure) {
  return {
    withFunctionalTestEnv(["JOB=${name}"], closure)
  }
}

def functionalTestProcess(String name, String script) {
  return functionalTestProcess(name) {
    notifyOnError {
      retryable(name) {
        runbld(script, "Execute ${name}")
      }
    }
  }
}

def ossCiGroupProcess(ciGroup) {
  return functionalTestProcess("ciGroup" + ciGroup) {
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

def xpackCiGroupProcess(ciGroup) {
  return functionalTestProcess("xpack-ciGroup" + ciGroup) {
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

def downloadCoverageArtifacts() {
  def storageLocation = "gs://kibana-ci-artifacts/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/coverage/"
  def targetLocation = "/tmp/downloaded_coverage"

  sh "mkdir -p '${targetLocation}' && gsutil -m cp -r '${storageLocation}' '${targetLocation}'"
}

def uploadCoverageArtifacts(prefix, pattern) {
  def uploadPrefix = "kibana-ci-artifacts/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/coverage/${prefix}"
  uploadGcsArtifact(uploadPrefix, pattern)
}

def withGcsArtifactUpload(workerName, closure) {
  def uploadPrefix = "kibana-ci-artifacts/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/${workerName}"
  def ARTIFACT_PATTERNS = [
    'target/kibana-*',
    'target/test-metrics/*',
    'target/kibana-security-solution/**/*.png',
    'target/junit/**/*',
    'target/test-suites-ci-plan.json',
    'test/**/screenshots/session/*.png',
    'test/**/screenshots/failure/*.png',
    'test/**/screenshots/diff/*.png',
    'test/functional/failure_debug/html/*.html',
    'x-pack/test/**/screenshots/session/*.png',
    'x-pack/test/**/screenshots/failure/*.png',
    'x-pack/test/**/screenshots/diff/*.png',
    'x-pack/test/functional/failure_debug/html/*.html',
    'x-pack/test/functional/apps/reporting/reports/session/*.pdf',
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

  if (env.CODE_COVERAGE) {
    sh 'tar -czf kibana-coverage.tar.gz target/kibana-coverage/**/*'
    uploadGcsArtifact("kibana-ci-artifacts/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/coverage/${workerName}", 'kibana-coverage.tar.gz')
  }
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

def buildOss(maxWorkers = '') {
  notifyOnError {
    withEnv(["KBN_OPTIMIZER_MAX_WORKERS=${maxWorkers}"]) {
      runbld("./test/scripts/jenkins_build_kibana.sh", "Build OSS/Default Kibana")
    }
  }
}

def buildXpack(maxWorkers = '') {
  notifyOnError {
    withEnv(["KBN_OPTIMIZER_MAX_WORKERS=${maxWorkers}"]) {
      runbld("./test/scripts/jenkins_xpack_build_kibana.sh", "Build X-Pack Kibana")
    }
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
      node scripts/report_failed_tests ${dryRun} ${globs}
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
    script: """
      cp /usr/local/bin/runbld .ci/
      cp /usr/local/bin/bash_standard_lib.sh .ci/
      cd .ci
      docker build -t kibana-ci -f ./Dockerfile .
    """,
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

def buildOssPlugins() {
  runbld('./test/scripts/jenkins_build_plugins.sh', 'Build OSS Plugins')
}

def buildXpackPlugins() {
  runbld('./test/scripts/jenkins_xpack_build_plugins.sh', 'Build X-Pack Plugins')
}

def withTasks(Map params = [worker: [:]], Closure closure) {
  catchErrors {
    def config = [name: 'ci-worker', size: 'xxl', ramDisk: true] + (params.worker ?: [:])

    workers.ci(config) {
      withCiTaskQueue(parallel: 24) {
        parallel([
          docker: {
            retry(2) {
              buildDocker()
            }
          },

          // There are integration tests etc that require the plugins to be built first, so let's go ahead and build them before set up the parallel workspaces
          ossPlugins: { buildOssPlugins() },
          xpackPlugins: { buildXpackPlugins() },
        ])

        catchErrors {
          closure()
        }
      }
    }
  }
}

def allCiTasks() {
  withTasks {
    tasks.check()
    tasks.lint()
    tasks.test()
    tasks.functionalOss()
    tasks.functionalXpack()
  }
}

def pipelineLibraryTests() {
  whenChanged(['vars/', '.ci/pipeline-library/']) {
    workers.base(size: 'flyweight', bootstrapped: false, ramDisk: false) {
      dir('.ci/pipeline-library') {
        sh './gradlew test'
      }
    }
  }
}

return this
