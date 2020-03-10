
def uploadCoverageStaticSite(timestamp) {
  def uploadPrefix = "gs://elastic-bekitzur-kibana-coverage-live/"
  def uploadPrefixWithTimeStamp = "${uploadPrefix}${timestamp}/"

  uploadBaseWebsiteFiles(uploadPrefix)
  uploadCoverageHtmls(uploadPrefixWithTimeStamp)
}

def uploadBaseWebsiteFiles(prefix) {
  [
    'src/dev/code_coverage/www/index.html',
    'src/dev/code_coverage/www/404.html'
  ].each { x ->
    uploadWithVault(prefix, x)
  }
}

def uploadCoverageHtmls(prefix) {
  [
    'target/kibana-coverage/functional-combined',
    'target/kibana-coverage/jest-combined',
    'target/kibana-coverage/mocha-combined',
  ].each { x ->
    uploadWithVault(prefix, x)
  }
}

def uploadWithVault(prefix, x) {
  def vaultSecret = 'secret/gce/elastic-bekitzur/service-account/kibana'

  withGcpServiceAccount.fromVaultSecret(vaultSecret, 'value') {
    sh """
        gsutil -m cp -r -a public-read -z js,css,html ${x} '${prefix}'
      """
  }
}
