def call(scmVars) {
  def repoInfo = [:]

  repoInfo.branch = env.ghprbSourceBranch ?: scmVars.GIT_LOCAL_BRANCH ?: scmVars.GIT_BRANCH
  repoInfo.targetBranch = env.ghprbTargetBranch

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
