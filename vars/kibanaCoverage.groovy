
def uploadCoverageStaticSite(timestamp) {
  def uploadPrefix = "kibana-ci-artifacts/jobs/${env.JOB_NAME}/${BUILD_NUMBER}/${timestamp}"
  def ARTIFACT_PATTERNS = [
    'target/kibana-*/**/*.png',
    'target/kibana-*/**/*.css',
    'target/kibana-*/**/*.html',
    'target/kibana-*/**/*.js',
  ]

  withEnv([
    "GCS_UPLOAD_PREFIX=${uploadPrefix}"
  ], {
    ARTIFACT_PATTERNS.each { pattern ->
      uploadGcsArtifact(uploadPrefix, pattern)
    }
  })
}

def uploadCoverageStaticSite_PROD(timestamp) {
  def uploadPrefix = "gs://elastic-bekitzur-kibana-coverage-live/jobs/${env.JOB_NAME}/${timestamp}/"

  uploadWithVault(uploadPrefix, 'src/dev/code_coverage/404.html')
  uploadWithVault(uploadPrefix, 'src/dev/code_coverage/live_cc_app')

  def dataUploadPrefix = uploadPrefix + 'live_cc_app/'
  uploadCoverageHtml(dataUploadPrefix)
}

def uploadWithVault(prefix, x) {
  def vaultSecret = 'secret/gce/elastic-bekitzur/service-account/kibana'

  withGcpServiceAccount.fromVaultSecret(vaultSecret, 'value') {
    sh """
        gsutil -m cp -r -a public-read -z js,css,html ${x} '${prefix}'
      """
  }
}

def uploadCoverageHtml(prefix) {
  def coverageHtmlPaths = [
    'target/kibana-coverage/functional-combined',
    'target/kibana-coverage/jest-combined',
    'target/kibana-coverage/mocha-combined',
  ]

  coverageHtmlPaths.each { x ->
    uploadWithVault(prefix, x)
  }
}

