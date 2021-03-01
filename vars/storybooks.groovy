def getStorybooksBucket() {
  return "ci-artifacts.kibana.dev/storybooks"
}

def getDestinationDir() {
  return env.ghprbPullId ? "pr-${env.ghprbPullId}" : buildState.get('checkoutInfo').branch.replace("/", "__")
}

def getUrl() {
  return "https://${getStorybooksBucket()}/${getDestinationDir()}"
}

def getUrlLatest() {
  return "${getUrl()}/latest"
}

def getUrlForCommit() {
  return "${getUrl()}/${buildState.get('checkoutInfo').commit}"
}

def upload() {
  dir("built_assets/storybook") {
    sh "mv ci_composite composite"

    def storybooks = sh(
      script: 'ls -1d */',
      returnStdout: true
    ).trim()
      .split('\n')
      .collect { it.replace('/', '') }
      .findAll { it != 'composite' }

    def listHtml = storybooks.collect { """<li><a href="${getUrlForCommit()}/${it}">${it}</a></li>""" }.join("\n")

    def html = """
      <html>
        <body>
          <h1>Storybooks</h1>
          <p><a href="${getUrlForCommit()}/composite">Composite Storybook</a></p>
          <h2>All</h2>
          <ul>
            ${listHtml}
          </ul>
        </body>
      </html>
    """

    writeFile(file: 'index.html', text: html)

    withGcpServiceAccount.fromVaultSecret('secret/kibana-issues/dev/ci-artifacts-key', 'value') {
      kibanaPipeline.bash("""
        gsutil -q -m cp -r -z js,css,html,json,map,txt,svg '*' 'gs://${getStorybooksBucket()}/${getDestinationDir()}/${buildState.get('checkoutInfo').commit}/'
        gsutil -h "Cache-Control:no-cache, max-age=0, no-transform" cp -z html 'index.html' 'gs://${getStorybooksBucket()}/${getDestinationDir()}/latest/'
      """, "Upload Storybooks to GCS")
    }

    buildState.set('storybooksUrl', getUrlForCommit())
  }
}

def build() {
  withEnv(["STORYBOOK_BASE_URL=${getUrlForCommit()}"]) {
    kibanaPipeline.bash('test/scripts/jenkins_storybook.sh', 'Build Storybooks')
  }
}

def buildAndUpload() {
  def sha = buildState.get('checkoutInfo').commit
  def context = 'Build and Publish Storybooks'

  githubCommitStatus.create(sha, 'pending', 'Building Storybooks', context)

  try {
    build()
    upload()
    githubCommitStatus.create(sha, 'success', 'Storybooks built', context, getUrlForCommit())
  } catch(ex) {
    githubCommitStatus.create(sha, 'error', 'Building Storybooks failed', context)
    throw ex
  }
}

return this
