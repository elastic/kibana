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
    def ingestManagementPackageRegistryPort = "61${processNumber}4"

    withEnv([
      "CI_PARALLEL_PROCESS_NUMBER=${processNumber}",
      "TEST_KIBANA_HOST=localhost",
      "TEST_KIBANA_PORT=${kibanaPort}",
      "TEST_KIBANA_URL=http://elastic:changeme@localhost:${kibanaPort}",
      "TEST_ES_URL=http://elastic:changeme@localhost:${esPort}",
      "TEST_ES_TRANSPORT_PORT=${esTransportPort}",
      "INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=${ingestManagementPackageRegistryPort}",
      "IS_PIPELINE_JOB=1",
      "JOB=${name}",
      "KBN_NP_PLUGINS_BUILT=true",
    ]) {
      githubPr.sendCommentOnError {
        closure()
      }
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
    'target/kibana-security-solution/**/*.png',
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
  githubPr.sendCommentOnError {
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

def buildOss() {
  githubPr.sendCommentOnError {
    runbld("./test/scripts/jenkins_build_kibana.sh", "Build OSS/Default Kibana")
  }
}

def buildXpack() {
  githubPr.sendCommentOnError {
    runbld("./test/scripts/jenkins_xpack_build_kibana.sh", "Build X-Pack Kibana")
  }
}

def runErrorReporter() {
  def status = buildUtils.getBuildStatus()
  def dryRun = status != "ABORTED" ? "" : "--no-github-update"

  bash(
    """
      source src/dev/ci_setup/setup_env.sh
      node scripts/report_failed_tests ${dryRun} target/junit/**/*.xml
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
