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
  ].each { uploadWithVault(prefix, it) }
}

def uploadCoverageHtmls(prefix) {
  [
    'target/kibana-coverage/functional-combined',
    'target/kibana-coverage/jest-combined',
    'target/kibana-coverage/mocha-combined',
  ].each { uploadWithVault(prefix, it) }
}

def uploadWithVault(prefix, path) {
  def vaultSecret = 'secret/gce/elastic-bekitzur/service-account/kibana'

  withGcpServiceAccount.fromVaultSecret(vaultSecret, 'value') {
    kibanaPipeline.bash("""
      gsutil -m cp -r -a public-read -z js,css,html ${path} '${prefix}'
    """, "### Upload files to GCS with vault, path: ${path}")
  }
}

def prokLinks(title) {
  kibanaPipeline.bash('''
cat << EOF > src/dev/code_coverage/www/index_partial_2.html
        <a class="nav-link" href="https://kibana-coverage.elastic.dev/${TIME_STAMP}/jest-combined/index.html">Latest Jest</a>
        <a class="nav-link" href="https://kibana-coverage.elastic.dev/${TIME_STAMP}/mocha-combined/index.html">Latest Mocha</a>
        <a class="nav-link" href="https://kibana-coverage.elastic.dev/${TIME_STAMP}/functional-combined/index.html">Latest FTR</a>
      </nav>
    </div>
  </header>

  <main role="main" class="inner cover">
    <!--    <h1 class="cover-heading"> - Master Branch</h1>-->
    <p class="lead">Use Kibana Stats to mine coverage data</p>
    <p class="lead">
      <a href="https://kibana-stats.elastic.dev/app/kibana#/dashboard/58b8db70-62f9-11ea-8312-7f2d69b79843?_g=(filters%3A!()%2CrefreshInterval%3A(pause%3A!t%2Cvalue%3A0)%2Ctime%3A(from%3Anow-7d%2Cto%3Anow))" class="btn btn-lg btn-primary">Dashboard</a>
    </p>
  </main>

  <footer class="mastfoot mt-auto">
    <div class="inner">
      <p>Please slack us at <a href="https://app.slack.com/client/T0CUZ52US/C0TR0FAET">#kibana-qa</a> if you've questions</p>
    </div>
  </footer>
</div>
</body>
</html>
EOF
  ''', title)
  kibanaPipeline.bash('''
    cat src/dev/code_coverage/www/index_partial.html > src/dev/code_coverage/www/index.html
    cat src/dev/code_coverage/www/index_partial_2.html >> src/dev/code_coverage/www/index.html

    echo "### Prok'd Index File: ..."
    cat src/dev/code_coverage/www/index.html
  ''', "### Combine Index Partials")
}
def collectVcsInfo(title) {
  kibanaPipeline.bash('''
    predicate() {
      x=$1
      if [ -n "$x" ]; then
        return
      else
        echo "### 1 or more variables that Code Coverage needs, are undefined"
        exit 1
      fi
    }
    CMD="git log --pretty=format"
    XS=("${GIT_BRANCH}" \
        "$(${CMD}":%h" -1)" \
        "$(${CMD}":%an" -1)" \
        "$(${CMD}":%s" -1)")
    touch VCS_INFO.txt
    for X in "${!XS[@]}"; do
    {
      predicate "${XS[X]}"
      echo "${XS[X]}" >> VCS_INFO.txt
    }
    done
    echo "### VCS_INFO:"
    cat VCS_INFO.txt
    ''', title
  )
}

def bootMergeAndIngest(buildNum, buildUrl, title) {
  kibanaPipeline.bash("""
    source src/dev/ci_setup/setup_env.sh
    # bootstrap from x-pack folder
    cd x-pack
    yarn kbn bootstrap --prefer-offline
    # Return to project root
    cd ..
    . src/dev/code_coverage/shell_scripts/extract_archives.sh
    . src/dev/code_coverage/shell_scripts/fix_html_reports_parallel.sh
    . src/dev/code_coverage/shell_scripts/merge_jest_and_functional.sh
    . src/dev/code_coverage/shell_scripts/copy_mocha_reports.sh
    . src/dev/code_coverage/shell_scripts/ingest_coverage.sh ${buildNum} ${buildUrl}
  """, title)
}

def ingestWithVault(buildNum, buildUrl, title) {
  def vaultSecret = 'secret/kibana-issues/prod/coverage/elasticsearch'
  withVaultSecret(secret: vaultSecret, secret_field: 'host', variable_name: 'HOST_FROM_VAULT') {
    withVaultSecret(secret: vaultSecret, secret_field: 'username', variable_name: 'USER_FROM_VAULT') {
      withVaultSecret(secret: vaultSecret, secret_field: 'password', variable_name: 'PASS_FROM_VAULT') {
        bootMergeAndIngest(buildNum, buildUrl, title)
      }
    }
  }
}

def ingest(timestamp, title) {
  withEnv([
    "TIME_STAMP=${timestamp}",
  ]) {
    ingestWithVault(BUILD_NUMBER, BUILD_URL, title)
  }
}

def runTests() {
  parallel([
    'kibana-intake-agent': workers.intake('kibana-intake', './test/scripts/jenkins_unit.sh'),
    'x-pack-intake-agent': {
      withEnv([
        'NODE_ENV=test' // Needed for jest tests only
      ]) {
        workers.intake('x-pack-intake', './test/scripts/jenkins_xpack.sh')()
      }
    },
    'kibana-oss-agent'   : workers.functional(
      'kibana-oss-tests',
      { kibanaPipeline.buildOss() },
      ossProks()
    ),
    'kibana-xpack-agent' : workers.functional(
      'kibana-xpack-tests',
      { kibanaPipeline.buildXpack() },
      xpackProks()
    ),
  ])
}

def ossProks() {
  return [
    'oss-ciGroup1' : kibanaPipeline.ossCiGroupProcess(1),
    'oss-ciGroup2' : kibanaPipeline.ossCiGroupProcess(2),
    'oss-ciGroup3' : kibanaPipeline.ossCiGroupProcess(3),
    'oss-ciGroup4' : kibanaPipeline.ossCiGroupProcess(4),
    'oss-ciGroup5' : kibanaPipeline.ossCiGroupProcess(5),
    'oss-ciGroup6' : kibanaPipeline.ossCiGroupProcess(6),
    'oss-ciGroup7' : kibanaPipeline.ossCiGroupProcess(7),
    'oss-ciGroup8' : kibanaPipeline.ossCiGroupProcess(8),
    'oss-ciGroup9' : kibanaPipeline.ossCiGroupProcess(9),
    'oss-ciGroup10': kibanaPipeline.ossCiGroupProcess(10),
    'oss-ciGroup11': kibanaPipeline.ossCiGroupProcess(11),
    'oss-ciGroup12': kibanaPipeline.ossCiGroupProcess(12),
  ]
}

def xpackProks() {
  return [
    'xpack-ciGroup1' : kibanaPipeline.xpackCiGroupProcess(1),
    'xpack-ciGroup2' : kibanaPipeline.xpackCiGroupProcess(2),
    'xpack-ciGroup3' : kibanaPipeline.xpackCiGroupProcess(3),
    'xpack-ciGroup4' : kibanaPipeline.xpackCiGroupProcess(4),
    'xpack-ciGroup5' : kibanaPipeline.xpackCiGroupProcess(5),
    'xpack-ciGroup6' : kibanaPipeline.xpackCiGroupProcess(6),
    'xpack-ciGroup7' : kibanaPipeline.xpackCiGroupProcess(7),
    'xpack-ciGroup8' : kibanaPipeline.xpackCiGroupProcess(8),
    'xpack-ciGroup9' : kibanaPipeline.xpackCiGroupProcess(9),
    'xpack-ciGroup10': kibanaPipeline.xpackCiGroupProcess(10),
  ]
}

return this
