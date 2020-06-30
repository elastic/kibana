def call(branchOverride) {
  def repoInfo = [
    branch: branchOverride ?: env.ghprbSourceBranch,
    targetBranch: env.ghprbTargetBranch,
  ]

  if (repoInfo.branch == null) {
    if (!(params.branch_specifier instanceof String)) {
      throw new Exception(
        "Unable to determine branch automatically, either pass a branch name to getCheckoutInfo() or use the branch_specifier param."
      )
    }

    // strip prefix from the branch specifier to make it consistent with ghprbSourceBranch
    repoInfo.branch = params.branch_specifier.replaceFirst(/^(refs\/heads\/|origin\/)/, "")
  }

  repoInfo.commit = sh(
    script: "git rev-parse HEAD",
    label: "determining checked out sha",
    returnStdout: true
  ).trim()

  if (repoInfo.targetBranch) {
    // Try to clone fetch from Github up to 8 times, waiting 15 secs between attempts
    retryWithDelay(8, 15) {
      sh(
        script: "git fetch origin ${repoInfo.targetBranch}",
        label: "fetch latest from '${repoInfo.targetBranch}' at origin"
      )
    }

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
