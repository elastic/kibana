def withWorkers(machineName, preWorkerClosure = {}, inParallel = {}, workerClosures = [:]) {
  return {
    jobRunner('tests-64', true) {
      withGcsArtifactUpload(machineName, {
        withPostBuildReporting {
          doSetup()

          parallel([
            one: {
              preWorkerClosure()

              def nextWorker = 1
              def worker = { workerClosure ->
                def workerNumber = nextWorker
                nextWorker++

                return {
                  // This delay helps smooth out CPU load caused by ES/Kibana instances starting up at the same time
                  def delay = (workerNumber-1)*7 // TODO
                  sleep(delay)

                  workerClosure(workerNumber)
                }
              }

              def workers = [:]
              workerClosures.each { workerName, workerClosure ->
                workers[workerName] = worker(workerClosure)
              }

              parallel(workers)
            },
            two: inParallel
          ])
        }
      })
    }
  }
}

def withWorker(machineName, label, Closure closure) {
  return {
    jobRunner(label, false) {
      withGcsArtifactUpload(machineName) {
        withPostBuildReporting {
          doSetup()
          closure()
        }
      }
    }
  }
}

def intakeWorker(jobName, String script) {
  return withWorker(jobName, 'linux && immutable') {
    withEnv([
      "JOB=${jobName}",
    ]) {
      runbld(script, "Execute ${jobName}")
    }
  }
}

def withPostBuildReporting(Closure closure) {
  try {
    closure()
  } finally {
    catchError {
      runErrorReporter()
    }

    catchError {
      runbld.junit()
    }

    catchError {
      publishJunit()
    }
  }
}

def getPostBuildWorker(name, closure) {
  return { workerNumber ->
    def kibanaPort = "61${workerNumber}1"
    def esPort = "61${workerNumber}2"
    def esTransportPort = "61${workerNumber}3"

    withEnv([
      "CI_WORKER_NUMBER=${workerNumber}",
      "TEST_KIBANA_HOST=localhost",
      "TEST_KIBANA_PORT=${kibanaPort}",
      "TEST_KIBANA_URL=http://elastic:changeme@localhost:${kibanaPort}",
      "TEST_ES_URL=http://elastic:changeme@localhost:${esPort}",
      "TEST_ES_TRANSPORT_PORT=${esTransportPort}",
      "IS_PIPELINE_JOB=1",
    ]) {
      closure()
    }
  }
}

def getOssCiGroupWorker(ciGroup) {
  return getPostBuildWorker("ciGroup" + ciGroup, {
    withEnv([
      "CI_GROUP=${ciGroup}",
      "JOB=kibana-ciGroup${ciGroup}",
    ]) {
      retryable("kibana-ciGroup${ciGroup}") {
        runbld("./test/scripts/jenkins_ci_group.sh", "Execute kibana-ciGroup${ciGroup}")
      }
    }
  })
}

def getXpackCiGroupWorker(ciGroup) {
  return getPostBuildWorker("xpack-ciGroup" + ciGroup, {
    withEnv([
      "CI_GROUP=${ciGroup}",
      "JOB=xpack-kibana-ciGroup${ciGroup}",
    ]) {
      retryable("xpack-kibana-ciGroup${ciGroup}") {
        runbld("./test/scripts/jenkins_xpack_ci_group.sh", "Execute xpack-kibana-ciGroup${ciGroup}")
      }
    }
  })
}

def jobRunner(label, useRamDisk, closure) {
  node(label) {
    agentInfo.print()

    if (useRamDisk) {
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

    def scmVars

    // Try to clone from Github up to 8 times, waiting 15 secs between attempts
    retryWithDelay(8, 15) {
      scmVars = checkout scm
    }

    withEnv([
      "CI=true",
      "HOME=${env.JENKINS_HOME}",
      "PR_SOURCE_BRANCH=${env.ghprbSourceBranch ?: ''}",
      "PR_TARGET_BRANCH=${env.ghprbTargetBranch ?: ''}",
      "PR_AUTHOR=${env.ghprbPullAuthorLogin ?: ''}",
      "TEST_BROWSER_HEADLESS=1",
      "GIT_BRANCH=${scmVars.GIT_BRANCH}",
    ]) {
      withCredentials([
        string(credentialsId: 'vault-addr', variable: 'VAULT_ADDR'),
        string(credentialsId: 'vault-role-id', variable: 'VAULT_ROLE_ID'),
        string(credentialsId: 'vault-secret-id', variable: 'VAULT_SECRET_ID'),
      ]) {
        // scm is configured to check out to the ./kibana directory
        dir('kibana') {
          closure()
        }
      }
    }
  }
}

def uploadGcsArtifact(uploadPrefix, pattern) {
  return
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
      catchError {
        ARTIFACT_PATTERNS.each { pattern ->
          uploadGcsArtifact(uploadPrefix, pattern)
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
  junit(testResults: '../kibana-oss/target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)
  junit(testResults: '../kibana-xpack/target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)
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
  catchError {
    step([
      $class: 'Mailer',
      notifyEveryUnstableBuild: true,
      recipients: 'infra-root+build@elastic.co',
      sendToIndividuals: false
    ])
  }
}

def sendKibanaMail() {
  catchError {
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
  return
  runbld("./test/scripts/jenkins_setup.sh", "Setup Build Environment and Dependencies")
}

def buildOss() {
  sh 'cp -R ./test/scripts/. ../kibana-oss/test/scripts'
  return
  sh 'cp -R ./. ../kibana-oss'
  dir('../kibana-oss') {
    runbld("./test/scripts/jenkins_build_kibana.sh", "Build OSS/Default Kibana")
  }
}

def buildXpack() {
  return
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
def processOssQueue(queue, finishedSuites, workerNumber) {
  while(!queue.isEmpty()) {
    def testSuite
    try {
      testSuite = queue.pop()
    } catch (ex) {
      print ex.toString()
      continue
    }

    withEnv([
      "CI_GROUP=${workerNumber}",
      "JOB=kibana-ciGroup${workerNumber}",
      "REMOVE_KIBANA_INSTALL_DIR=1",
    ]) {
      catchError {
        retryable("kibana-ciGroup${workerNumber}") {
          testSuite.startTime = new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'", TimeZone.getTimeZone("UTC"))
          testSuite.success = null
          def tagString = testSuite.tags.collect { "--include-tag '${it}'" }.join(' ')

          try {
            // runbld("./test/scripts/jenkins_xpack_ci_group.sh", "Execute xpack-kibana-ciGroup${workerNumber}")
            bash(
              """
                source test/scripts/jenkins_test_setup_oss.sh
                node scripts/functional_tests \
                  --config '${testSuite.config}' \
                  --debug --bail \
                  --kibana-install-dir "\$KIBANA_INSTALL_DIR" \
                  ${tagString}
              """, "Execute oss tests"
            )
            testSuite.success = true
          } catch (ex) {
            testSuite.success = false
            throw ex
          } finally {
            testSuite.endTime = new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'", TimeZone.getTimeZone("UTC"))
          }
        }
      }
    }
    catchError {
      print testSuite
      finishedSuites << testSuite
    }
  }
}

def processXpackQueue(queue, finishedSuites, workerNumber) {
  while(!queue.isEmpty()) {
    def testSuite
    try {
      testSuite = queue.pop()
    } catch (ex) {
      print ex.toString()
      continue
    }

    withEnv([
      "CI_GROUP=${workerNumber}",
      "JOB=xpack-kibana-ciGroup${workerNumber}",
      "REMOVE_KIBANA_INSTALL_DIR=1",
    ]) {
      catchError {
        retryable("xpack-kibana-ciGroup${workerNumber}") {
          testSuite.startTime = new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'", TimeZone.getTimeZone("UTC"))
          testSuite.success = null
          def tagString = testSuite.tags.collect { "--include-tag '${it}'" }.join(' ')

          try {
            // runbld("./test/scripts/jenkins_xpack_ci_group.sh", "Execute xpack-kibana-ciGroup${workerNumber}")
            bash(
              """
                source test/scripts/jenkins_test_setup_xpack.sh
                node scripts/functional_tests \
                  --config '${testSuite.config}' \
                  --debug --bail \
                  --kibana-install-dir "\$KIBANA_INSTALL_DIR" \
                  ${tagString}
              """, "Execute x-pack tests"
            )
            testSuite.success = true
          } catch (ex) {
            testSuite.success = false
            throw ex
          } finally {
            testSuite.endTime = new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'", TimeZone.getTimeZone("UTC"))
          }
        }
      }
    }
    catchError {
      print testSuite
      finishedSuites << testSuite
    }
  }
}

def getFunctionalQueueWorker(queue, finishedSuites, workerNumber) {
  return getPostBuildWorker("functional-test-queue-" + workerNumber, {
    dir('../kibana-oss') {
      processOssQueue(queue.oss, finishedSuites.oss, workerNumber)
    }

    // timeout
    while(!queue.containsKey('xpack')) {
      sleep 15
    }

    dir('../kibana-xpack') {
      processXpackQueue(queue.xpack, finishedSuites.xpack, workerNumber)
    }
  })
}

def prepareOssTestQueue(queue) {
  def items = toJSON(readFile(file: 'test-suites-for-ci.json'))
  queue.oss = items.oss.reverse() // .reverse() is used here because an older version of groovy, .pop() removes from the end instead of the beginning
}

def prepareXpackTestQueue(queue) {
  def items = toJSON(readFile(file: 'test-suites-for-ci-sorted.json'))
  queue.xpack = items.xpack.reverse() // .reverse() is used here because an older version of groovy, .pop() removes from the end instead of the beginning
}

return this
