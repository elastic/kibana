import groovy.transform.Field

public static @Field KIBANA_FINISHED_FUNCTIONAL_SUITES = [:]

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

def withFunctionalTestEnv(List additionalEnvs = [], Closure closure) {
  // This can go away once everything that uses the deprecated workers.parallelProcesses() is moved to task queue
  def parallelId = env.TASK_QUEUE_PROCESS_ID ?: env.CI_PARALLEL_PROCESS_NUMBER

  def kibanaPort = "61${parallelId}1"
  def esPort = "61${parallelId}2"
  def esTransportPort = "61${parallelId}3"

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
    retryable(name) {
      bash(script, "Execute ${name}")
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
        bash("./test/scripts/jenkins_ci_group.sh", "Execute kibana-ciGroup${ciGroup}")
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
        bash("./test/scripts/jenkins_xpack_ci_group.sh", "Execute xpack-kibana-ciGroup${ciGroup}")
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
    'target/test-suites-ci-plan.json',
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
    uploadGcsArtifact("kibana-pipeline-testing/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/coverage/${workerName}", 'kibana-coverage.tar.gz')
  }
}

def publishJunit() {
  junit(testResults: 'target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)

  // junit() is weird about paths for security reasons, so we need to actually change to an upper directory first
  dir(env.WORKSPACE) {
    junit(testResults: 'parallel/*/kibana/target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)
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
  bash("./test/scripts/jenkins_setup.sh", "Setup Build Environment and Dependencies")
}

def buildOss() {
  bash("./test/scripts/jenkins_build_kibana.sh", "Build OSS/Default Kibana")
}

def buildXpack() {
  bash("./test/scripts/jenkins_xpack_build_kibana.sh", "Build X-Pack Kibana")
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

def getFinishedSuites() {
  return KIBANA_FINISHED_FUNCTIONAL_SUITES
}

def addFinishedSuite(type, suite) {
  KIBANA_FINISHED_FUNCTIONAL_SUITES[type] = KIBANA_FINISHED_FUNCTIONAL_SUITES[type] ?: []
  KIBANA_FINISHED_FUNCTIONAL_SUITES[type] << suite
}

def runFunctionalTestSuite(type, testSuite) {
  def testMetadataPath = pwd() + "/target/test_metadata_${type}_${env.TASK_QUEUE_PROCESS_ID}.json"
  def byFile = [:]
  testSuite.files.each { byFile[it.file] = it }

  withFunctionalTestEnv([
    "JOB=kibana-functional-${type}-${env.TASK_QUEUE_PROCESS_ID}-${env.TASK_QUEUE_ITERATION_ID}",
    "TEST_METADATA_PATH=${testMetadataPath}",
  ]) {
    catchErrors {
      retryable(env.JOB) {
        if (testSuite.files && testSuite.files.size() > 0) {
          try {
            def filesString = testSuite.files.collect { "--include '${it.file}'" }.join(' ')
            def command = "test/scripts/jenkins_functional_tests.sh ${type} ${testSuite.config} ${filesString}"
            // def scriptPath = "${pwd()}/target/functional-tests-script.sh"
            // writeFile(file: scriptPath, text: command)
            // runbld(scriptPath, "${type} tests: ${testSuite.config}")
            bash(command, "${type} tests: ${testSuite.config}")
          } finally {
            catchErrors {
              def suites = toJSON(readFile(file: testMetadataPath))
              suites.each {
                catchErrors {
                  if (byFile[it.file]) {
                    it.previousDuration = byFile[it.file].duration
                  }
                  addFinishedSuite(type, it)
                }
              }
              // Filter out the test suites that were successful, in case a flaky test needs to retry
              // That way, only the suite(s) that failed will run a second time
              testSuite.files = testSuite.files.findAll { suite -> !suites.find { finishedSuite -> finishedSuite.file == suite.file && finishedSuite.success } }
            }
          }
        }
      }
    }
  }
}

// Only works inside of a worker after scm checkout
def getTargetBranch() {
  return env.ghprbTargetBranch ?: (env.GIT_BRANCH - ~/^[^\/]+\//)
}

def withFunctionalTaskQueue(Map options = [:], Closure closure) {
  def setupClosure = {
    bash("${env.WORKSPACE}/kibana/test/scripts/jenkins_setup_parallel_workspace.sh", "Set up duplicate workspace for parallel process")
  }

  def config = [parallel: 24, setup: setupClosure] + options

  withTaskQueue(config) {
    sh 'mkdir -p target'

    def functionalMetricsPath = ""
    try {
      functionalMetricsPath = functionalTests.downloadMetrics()
    } catch (ex) {
      buildUtils.printStacktrace(ex)
      print "Error reading previous functional test metrics. Will create a non-optimal test plan."
    }

    def testPlan = functionalTests.createPlan(functionalMetricsPath)
    closure.call(testPlan)
  }
}

def allCiTasks() {
  parallel([
    'kibana-intake-agent': workers.intake('kibana-intake', './test/scripts/jenkins_unit.sh'),
    'x-pack-intake-agent': workers.intake('x-pack-intake', './test/scripts/jenkins_xpack.sh'),
    'kibana-functional-agent': {
      kibanaPipeline.functionalTasks()
    },
  ])
}

def functionalTasks() {
  def config = [name: 'parallel-worker', size: 'xxl', ramDisk: true]

  workers.ci(config) {
    catchErrors {
      withFunctionalTaskQueue(parallel: 24) { testPlan ->
        task {
          buildOss()

          tasks(testPlan.oss.collect { return { runFunctionalTestSuite('oss', it) } })

          tasks([
            functionalTestProcess('oss-accessibility', './test/scripts/jenkins_accessibility.sh'),
            // functionalTestProcess('oss-visualRegression', './test/scripts/jenkins_visual_regression.sh'),
          ])

          // Does this stuff require running out of the same workspace that the build happened in?
          functionalTestProcess('oss-pluginFunctional', './test/scripts/jenkins_plugin_functional.sh')()
        }

        task {
          buildXpack()

          tasks(testPlan.xpack.collect { return { runFunctionalTestSuite('xpack', it) } })

          tasks([
            functionalTestProcess('xpack-accessibility', './test/scripts/jenkins_xpack_accessibility.sh'),
            // functionalTestProcess('xpack-visualRegression', './test/scripts/jenkins_xpack_visual_regression.sh'),
          ])

          whenChanged(['x-pack/plugins/siem/', 'x-pack/legacy/plugins/siem/', 'x-pack/test/siem_cypress/']) {
            task(functionalTestProcess('xpack-siemCypress', './test/scripts/jenkins_siem_cypress.sh'))
          }
        }
      }
    }

    functionalTests.uploadMetrics()
  }
}

return this
