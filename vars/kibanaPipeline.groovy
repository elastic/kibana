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
  // return
  runbld("./test/scripts/jenkins_setup.sh", "Setup Build Environment and Dependencies")
}

def buildOss() {
  // sh 'cp ./test-suites-for-ci.json ../kibana-oss/test-suites-for-ci.json'
  // return
  sh 'cp -R ./. ../kibana-oss'
  dir('../kibana-oss') {
    runbld("./test/scripts/jenkins_build_kibana.sh", "Build OSS/Default Kibana")
  }
}

def buildXpack() {
  // return
  sh 'cp -R ./. ../kibana-xpack'
  dir('../kibana-xpack') {
    runbld("./test/scripts/jenkins_xpack_build_kibana.sh", "Build X-Pack Kibana")
  }
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

def processFunctionalQueue(queue, finishedSuites, workerNumber, type) {
  def testMetadataPath = pwd() + "target/test_metadata_${type}_${workerNumber}.json"
  def iteration = 0

  withEnv([
    "CI_GROUP=${workerNumber}",
    "JOB=kibana-${type}-${workerNumber}",
    "REMOVE_KIBANA_INSTALL_DIR=1",
    "TEST_METADATA_PATH=${testMetadataPath}"
  ]) {
    while(!queue.isEmpty()) {
      def testSuite
      def byFile = [:]
      try {
        testSuite = queue.pop()
        byFile = [:]
        testSuite.files.each { byFile[it.file] = it }
      } catch (ex) {
        print ex.toString()
        continue
      }

      iteration++

      retryable("kibana-functional-${type}-${workerNumber}-${iteration}") {
        if (testSuite.files && testSuite.files.size() > 0) {
          catchErrorClean {
            def filesString = testSuite.files.collect { "--include-file '${it.file}'" }.join(' ')

            // TODO runbld
            bash(
              """
                export JOB=${env.JOB}-${iteration}
                source test/scripts/jenkins_test_setup_${type}.sh
                node scripts/functional_tests \
                  --config '${testSuite.config}' \
                  --debug \
                  ${filesString}
              """, "${type} tests: ${testSuite.config}"
            )

            // --kibana-install-dir "\$KIBANA_INSTALL_DIR" \
          }

          catchErrorClean {
            def suites = toJSON(readFile(file: testMetadataPath))
            suites.each {
              catchErrorClean {
                if (byFile[it.file]) {
                  it.previousDuration = byFile[it.file].duration
                }
                finishedSuites << it
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

def catchErrorClean(Closure closure) {
  try {
    closure()
  } catch (ex) {
    catchError {
      throw ex
    }
  }
}

def processOssQueue(queue, finishedSuites, workerNumber) {
  return processFunctionalQueue(queue, finishedSuites, workerNumber, "oss")
}

def processXpackQueue(queue, finishedSuites, workerNumber) {
  return processFunctionalQueue(queue, finishedSuites, workerNumber, "xpack")
}

def getFunctionalQueueWorker(queue, finishedSuites, workerNumber) {
  return functionalTestProcess("functional-test-queue-" + workerNumber, {
    dir('../kibana-oss') {

      // Allocate a few workers in the middle of the pack for Firefox
      // if (workerNumber >= 12 && workerNumber <= 15) {
      //   processOssQueue(queue.ossFirefox, finishedSuites.ossFirefox, workerNumber)
      // }

      processOssQueue(queue.oss, finishedSuites.oss, workerNumber)
    }

    // TODO timeout?
    while(!queue.containsKey('xpack')) {
      sleep(60)
    }

    dir('../kibana-xpack') {
      // if (workerNumber >= 12 && workerNumber <= 15) {
      //   processXpackQueue(queue.xpackFirefox, finishedSuites.xpackFirefox, workerNumber)
      // }

      processXpackQueue(queue.xpack, finishedSuites.xpack, workerNumber)
    }
  })
}

def prepareOssTestQueue(queue) {
  def items = toJSON(readFile(file: 'target/test-suites-ci-plan.json'))
  queue.oss = items.oss.reverse() // .reverse() is used here because an older version of groovy, .pop() removes from the end instead of the beginning
  queue.ossFirefox = items.ossFirefox.reverse()
}

def prepareXpackTestQueue(queue) {
  def items = toJSON(readFile(file: 'target/test-suites-ci-plan.json'))
  queue.xpack = items.xpack.reverse() // .reverse() is used here because an older version of groovy, .pop() removes from the end instead of the beginning
  queue.xpackFirefox = items.xpackFirefox.reverse()
}

// Only works inside of a worker after scm checkout
def getTargetBranch() {
  return env.ghprbTargetBranch ?: (env.GIT_BRANCH - ~/^[^\/]+\//)
}

return this
