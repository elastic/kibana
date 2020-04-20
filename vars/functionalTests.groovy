def downloadMetrics(String branch, String directory = 'target') {
  googleStorageDownload(
    credentialsId: 'kibana-ci-gcs-plugin',
    bucketUri: "gs://kibana-ci-functional-metrics/${branch}/latest.json",
    localDirectory: directory,
    pathPrefix: branch,
  )

  return "${directory}/latest.json"
}

def downloadMetrics() {
  def branch = kibanaPipeline.getTargetBranch()
  try {
    return downloadMetrics(branch)
  } catch (ex) {
    if (branch == 'master') {
      throw ex
    }

    buildUtils.printStacktrace(ex)
    return downloadMetrics('master')
  }
}

def uploadMetrics() {
  def metricsJson = toJSON(kibanaPipeline.getFinishedSuites()).toString()
  dir('target/test-metrics') {
    def date = (new Date()).format("yyyyMMdd-HHmmss")
    def filename = "metrics-${date}.json"

    writeFile(file: filename, text: metricsJson)

    if (!githubPr.isPr()) {
      googleStorageUpload(
        credentialsId: 'kibana-ci-gcs-plugin',
        bucket: "gs://kibana-ci-functional-metrics/${kibanaPipeline.getTargetBranch()}",
        pattern: filename,
      )

      def status = buildUtils.getBuildStatus()
      // if (status == 'SUCCESS' || status == 'UNSTABLE') { // TODO
        sh "cp '${filename}' latest.json"
        googleStorageUpload(
          credentialsId: 'kibana-ci-gcs-plugin',
          bucket: "gs://kibana-ci-functional-metrics/${kibanaPipeline.getTargetBranch()}",
          pattern: 'latest.json',
        )
      // }
    }
  }
}

def createPlan(functionalMetricsPath = "") {
  withEnv(["FUNCTIONAL_METRICS_PATH=${functionalMetricsPath}"]) {
    kibanaPipeline.bash("source src/dev/ci_setup/setup_env.sh; node scripts/create_functional_test_plan.js", "Create functional test plan")
  }
  def testPlan = toJSON(readFile(file: 'target/test-suites-ci-plan.json'))

  return testPlan
}

return this
