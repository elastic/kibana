def call() {

  def repoInfo = [
    branch: env.ghprbSourceBranch ?: params.branch_specifier ?: null,
    targetBranch: env.ghprbTargetBranch,
  ]

  repoInfo.commit = sh(
    script: "git rev-parse HEAD",
    label: "determining checked out sha",
    returnStdout: true
  ).trim()

  if (repoInfo.targetBranch) {
    sh(
      script: "git fetch origin ${repoInfo.targetBranch}",
      label: "fetch latest from '${repoInfo.targetBranch}' at origin"
    )
    repoInfo.mergeBase = sh(
      script: "git merge-base HEAD FETCH_HEAD",
      label: "determining merge point with '${repoInfo.targetBranch}' at origin",
      returnStdout: true
    ).trim()
  }

  print "repoInfo: ${repoInfo}"

  return repoInfo
}

return this
