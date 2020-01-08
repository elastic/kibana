def withWorkers(machineName, preWorkerClosure = {}, workerClosures = [:]) {
  return {
    jobRunner('tests-xl', true) {
      withGcsArtifactUpload(machineName, {
        try {
          doSetup()
          preWorkerClosure()

          def nextWorker = 1
          def worker = { workerClosure ->
            def workerNumber = nextWorker
            nextWorker++

            return {
              // This delay helps smooth out CPU load caused by ES/Kibana instances starting up at the same time
              def delay = (workerNumber-1)*20
              sleep(delay)

              workerClosure(workerNumber)
            }
          }

          def workers = [:]
          workerClosures.each { workerName, workerClosure ->
            workers[workerName] = worker(workerClosure)
          }

          parallel(workers)
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
      })
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
      runbld("./test/scripts/jenkins_ci_group.sh", "Execute kibana-ciGroup${ciGroup}")
    }
  })
}

def getXpackCiGroupWorker(ciGroup) {
  return getPostBuildWorker("xpack-ciGroup" + ciGroup, {
    withEnv([
      "CI_GROUP=${ciGroup}",
      "JOB=xpack-kibana-ciGroup${ciGroup}",
    ]) {
      runbld("./test/scripts/jenkins_xpack_ci_group.sh", "Execute xpack-kibana-ciGroup${ciGroup}")
    }
  })
}

def legacyJobRunner(name) {
  return {
    parallel([
      "${name}": {
        withEnv([
          "JOB=${name}",
        ]) {
          jobRunner('linux && immutable', false) {
            withGcsArtifactUpload(name, {
              try {
                runbld('.ci/run.sh', "Execute ${name}", true)
              } finally {
                catchError {
                  runErrorReporter()
                }

                catchError {
                  publishJunit()
                }
              }
            })
          }
        }
      }
    ])
  }
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

// TODO what should happen if GCS, Junit, or email publishing fails? Unstable build? Failed build?

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
}

def publishJunit() {
  junit(testResults: 'target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)
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
  runbld("./test/scripts/jenkins_setup.sh", "Setup Build Environment and Dependencies")
}

def buildOss() {
  runbld("./test/scripts/jenkins_build_kibana.sh", "Build OSS/Default Kibana")
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

return this
