def withPostBuildReporting(Closure closure) {
  try {
    closure()
  } finally {
    catchErrors {
      runErrorReporter()
    }

    catchErrors {
      runbld.junit()
    }

    catchErrors {
      publishJunit()
    }
  }
}

def functionalTestProcess(String name, Closure closure) {
  return { processNumber ->
    def kibanaPort = "61${processNumber}1"
    def esPort = "61${processNumber}2"
    def esTransportPort = "61${processNumber}3"

    withEnv([
      "CI_PARALLEL_PROCESS_NUMBER=${processNumber}",
      "TEST_KIBANA_HOST=localhost",
      "TEST_KIBANA_PORT=${kibanaPort}",
      "TEST_KIBANA_URL=http://elastic:changeme@localhost:${kibanaPort}",
      "TEST_ES_URL=http://elastic:changeme@localhost:${esPort}",
      "TEST_ES_TRANSPORT_PORT=${esTransportPort}",
      "IS_PIPELINE_JOB=1",
      "JOB=${name}",
      "KBN_NP_PLUGINS_BUILT=true",
    ]) {
      closure()
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
  def storageLocation = "gs://kibana-pipeline-testing/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/coverage/"
  def targetLocation = "/tmp/downloaded_coverage"

  sh "mkdir -p '${targetLocation}' && gsutil -m cp -r '${storageLocation}' '${targetLocation}'"
}

def uploadCoverageArtifacts(prefix, pattern) {
  def uploadPrefix = "kibana-pipeline-testing/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/coverage/${prefix}"
  uploadGcsArtifact(uploadPrefix, pattern)
}

def withGcsArtifactUpload(workerName, closure) {
  def uploadPrefix = "kibana-pipeline-testing/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/${workerName}"
  def ARTIFACT_PATTERNS = [
    'target/kibana-*',
    'target/test-metrics/*',
    'target/kibana-siem/**/*.png',
    'target/junit/**/*',
    'test/**/screenshots/**/*.png',
    'test/functional/failure_debug/html/*.html',
    'x-pack/test/**/screenshots/**/*.png',
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
          dir('../kibana-oss') {
            uploadGcsArtifact(uploadPrefix, pattern)
          }
          dir('../kibana-x-pack') {
            uploadGcsArtifact(uploadPrefix, pattern)
          }
        }
      }
    }
  })

  if (env.CODE_COVERAGE) {
    sh 'tar -czf kibana-coverage.tar.gz target/kibana-coverage/**/*'
    uploadGcsArtifact("kibana-pipeline-testing/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/coverage/${workerName}", 'kibana-coverage.tar.gz')
  }
}

def publishJunit() {
  junit(testResults: 'target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)
  dir('../') {
    junit(testResults: 'kibana-oss/target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)
    junit(testResults: 'kibana-xpack/target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)
  }
}

def sendMail() {
  // If the build doesn't have a result set by this point, there haven't been any errors and it can be marked as a success
  // The e-mail plugin for the infra e-mail depends upon this being set
  currentBuild.result = currentBuild.result ?: 'SUCCESS'

  def buildStatus = buildUtils.getBuildStatus()
  if (buildStatus != 'SUCCESS' && buildStatus != 'ABORTED') {
    node('flyweight') {
      sendInfraMail()
      sendKibanaMail()
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

def sendKibanaMail() {
  catchErrors {
    def buildStatus = buildUtils.getBuildStatus()
    if(params.NOTIFY_ON_FAILURE && buildStatus != 'SUCCESS' && buildStatus != 'ABORTED') {
      emailext(
        to: 'build-kibana@elastic.co',
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
  runbld("./test/scripts/jenkins_setup.sh", "Setup Build Environment and Dependencies")
}

def buildOss() {
  sh 'rm -rf .es' // TODO
  runbld("./test/scripts/jenkins_build_kibana.sh", "Build OSS/Default Kibana")
  sh "cp -R .es ${env.WORKSPACE}"
}

def buildXpack() {
  runbld("./test/scripts/jenkins_xpack_build_kibana.sh", "Build X-Pack Kibana")
}

def runErrorReporter() {
  def status = buildUtils.getBuildStatus()
  def dryRun = status != "ABORTED" ? "" : "--no-github-update"

  bash(
    """
      source src/dev/ci_setup/setup_env.sh
      node scripts/report_failed_tests ${dryRun}
    """,
    "Report failed tests, if necessary"
  )
}

def call(Map params = [:], Closure closure) {
  def config = [timeoutMinutes: 135, checkPrChanges: false] + params

  stage("Kibana Pipeline") {
    timeout(time: config.timeoutMinutes, unit: 'MINUTES') {
      timestamps {
        ansiColor('xterm') {
          if (config.checkPrChanges && githubPr.isPr()) {
            print "Checking PR for changes to determine if CI needs to be run..."

            if (prChanges.areChangesSkippable()) {
              print "No changes requiring CI found in PR, skipping."
              return
            }
          }
          closure()
        }
      }
    }
  }
}

this.finishedSuites = []

def getFinishedSuites() {
  return this.finishedSuites
}

def addFinishedSuite(type, suite) {
  this.finishedSuites[type] = this.finishedSuites[type] ?: []
  this.finishedSuites[type] << suite
}

def runFunctionalTestSuite(type, testSuite) {
  // TODO add finishedSuites somewhere
  def testMetadataPath = pwd() + "/target/test_metadata_${type}_${env.TASK_QUEUE_PROCESS_ID}.json"
  def byFile = [:]
  testSuite.files.each { byFile[it.file] = it }

  def kibanaPort = "61${env.TASK_QUEUE_PROCESS_ID}1"
  def esPort = "61${env.TASK_QUEUE_PROCESS_ID}2"
  def esTransportPort = "61${env.TASK_QUEUE_PROCESS_ID}3"

  withEnv([
    "CI_GROUP=${env.TASK_QUEUE_PROCESS_ID}",
    "REMOVE_KIBANA_INSTALL_DIR=1",
    "TEST_METADATA_PATH=${testMetadataPath}",
    "CI_PARALLEL_PROCESS_NUMBER=${env.TASK_QUEUE_PROCESS_ID}",
    "TEST_KIBANA_HOST=localhost",
    "TEST_KIBANA_PORT=${kibanaPort}",
    "TEST_KIBANA_URL=http://elastic:changeme@localhost:${kibanaPort}",
    "TEST_ES_URL=http://elastic:changeme@localhost:${esPort}",
    "TEST_ES_TRANSPORT_PORT=${esTransportPort}",
    "KBN_NP_PLUGINS_BUILT=true",
  ]) {

    // TODO add install-dir back below, and ensure that this process has a copy of the required build from the workspace root
    env.JOB = "kibana-functional-${type}-${env.TASK_QUEUE_PROCESS_ID}-${env.TASK_QUEUE_ITERATION_ID}"

    catchErrorClean {
      retryable(env.JOB) {
        if (testSuite.files && testSuite.files.size() > 0) {
          try {
            def filesString = testSuite.files.collect { "--include '${it.file}'" }.join(' ')

            try {
              bash("""
                if [[ ! -d .es ]]; then
                  cp -R ${WORKSPACE}/.es ./
                fi
              """, "Copy ES install cache")
            } catch (ex) {
              buildUtils.printStacktrace(ex)
            }

            def buildDir = ''

            if (type == 'oss') {
              bash("""
                if [[ ! -d build/oss ]]; then
                  mkdir -p build/oss
                  cp -R ${env.WORKSPACE}/kibana-build-oss/. build/oss/
                fi
              """, "Copy Kibana Build")
              buildDir = '$(realpath build/oss/kibana-*-SNAPSHOT-linux-x86_64)'
            }

            if (type == 'xpack') {
              bash("""
                if [[ ! -d install/kibana ]]; then
                  mkdir -p install
                  cp -R ${env.WORKSPACE}/kibana-build-xpack/. install/
                fi
              """, "Copy XPack Kibana Build")
              buildDir = '$(realpath install/kibana)'
            }

            // TODO runbld
            bash(
              """
                source test/scripts/jenkins_test_setup_${type}.sh
                node scripts/functional_tests \
                  --config '${testSuite.config}' \
                  --debug \
                  --kibana-install-dir "${buildDir}" \
                  ${filesString}
              """, "${type} tests: ${testSuite.config}"
            )
          } finally {
            catchErrorClean {
              def suites = toJSON(readFile(file: testMetadataPath))
              suites.each {
                catchErrorClean {
                  if (byFile[it.file]) {
                    it.previousDuration = byFile[it.file].duration
                  }
                  addFinishedSuite(type, it)
                }
              }
              testSuite.files = testSuite.files.findAll { suite -> !suites.find { finishedSuite -> finishedSuite.file == suite.file && finishedSuite.success } }
              print testSuite.files
            }
          }
        }
      }
    }
  }
}

def catchErrorClean(Closure closure) {
  try {
    closure()
  } catch (ex) {
    catchError {
      throw ex
    }
  }
}

// Only works inside of a worker after scm checkout
def getTargetBranch() {
  return env.ghprbTargetBranch ?: (env.GIT_BRANCH - ~/^[^\/]+\//)
}

def newPipeline(Closure closure = {}) {
  def config = [name: 'parallel-worker', label: 'tests-xxl', ramDisk: false]

  workers.ci(config) {

    def setupClosure = {
      sh 'cp -R ${WORKSPACE}/kibana/. .'
    }

    withTaskQueue(parallel: 24, setup: setupClosure) {
      sh 'mkdir -p target'

      try {
        googleStorageDownload(
          credentialsId: 'kibana-ci-gcs-plugin',
          bucketUri: "gs://kibana-ci-functional-metrics/${getTargetBranch()}/functional_test_suite_metrics.json",
          localDirectory: 'target',
          pathPrefix: getTargetBranch(),
        )
      } catch (ex) {
        buildUtils.printStacktrace(ex)

        try {
          googleStorageDownload(
            credentialsId: 'kibana-ci-gcs-plugin',
            bucketUri: "gs://kibana-ci-functional-metrics/master/functional_test_suite_metrics.json",
            localDirectory: 'target',
            pathPrefix: 'master',
          )
        } catch (innerEx) {
          buildUtils.printStacktrace(innerEx)
          print "Error reading previous functional test metrics. Will create a non-optimal test plan."
        }
      }

      // TODO
      bash("source src/dev/ci_setup/setup_env.sh; node scripts/create_functional_test_plan.js", "Create functional test plan")
      def testPlan = toJSON(readFile(file: 'target/test-suites-ci-plan.json'))
      // testPlan = [oss: testPlan.oss.reverse().take(1), xpack: []] // TODO

      task {
        buildOss()
        bash("mkdir -p ${env.WORKSPACE}/kibana-build-oss; mv build/oss/kibana-*-SNAPSHOT-linux-x86_64 ${env.WORKSPACE}/kibana-build-oss/", "Move OSS build")

        tasks(testPlan.oss.collect { return { runFunctionalTestSuite('oss', it) } })

        // Does this stuff require running out of the same workspace that the build happened in?
        bash("test/scripts/jenkins_build_kbn_tp_sample_panel_action.sh", "Build kbn_tp_sample_panel_action")
        bash("""
          source test/scripts/jenkins_test_setup_oss.sh
          yarn run grunt run:pluginFunctionalTestsRelease --from=source;
          yarn run grunt run:exampleFunctionalTestsRelease --from=source;
          yarn run grunt run:interpreterFunctionalTestsRelease;
        """, "Run OSS plugin functional tests")
      }

      task {
        buildXpack()
        bash("mkdir -p ${env.WORKSPACE}/kibana-build-xpack; mv install/kibana ${env.WORKSPACE}/kibana-build-xpack/", "Move XPack build")

        tasks(testPlan.xpack.collect { return { runFunctionalTestSuite('xpack', it) } })

        // task(getPostBuildWorker('xpack-visualRegression', { runbld('./test/scripts/jenkins_xpack_visual_regression.sh', 'Execute xpack-visualRegression') }))

        task({ runbld('./test/scripts/jenkins_xpack_accessibility.sh', 'Execute xpack-accessibility') })

        whenChanged(['x-pack/legacy/plugins/siem/', 'x-pack/test/siem_cypress/']) {
          task(functionalTestProcess('xpack-siemCypress', './test/scripts/jenkins_siem_cypress.sh'))
        }
      }
    }

    closure.call()
  }
}

return this
