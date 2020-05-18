def call() {

  def repoInfo = [
    branch: env.ghprbSourceBranch ?: params.branch_specifier ?: 'missing branch_specifier',
    targetBranch: env.ghprbTargetBranch,
  ]

  dir("kibana") {
    repoInfo.commit = sh(
      script: "git rev-parse HEAD",
      label: "determining checked out sha",
      returnStdout: true
    ).trim()

    if (repoInfo.targetBranch) {
      sh(
        script: "git fetch https://github.com/elastic/kibana.git ${repoInfo.targetBranch}",
        label: "fetch latest from '${repoInfo.targetBranch}' at https://github.com/elastic/kibana.git"
      )
      repoInfo.mergeBase = sh(
        script: "git merge-base HEAD FETCH_HEAD",
        label: "determining merge point with '${repoInfo.targetBranch}' at https://github.com/elastic/kibana.git",
        returnStdout: true
      ).trim()
    }
  }

  print "repoInfo: ${repoInfo}"

  return repoInfo
}

return this
