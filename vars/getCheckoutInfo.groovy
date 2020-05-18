def call(scmVars) {
  def branch = env.ghprbSourceBranch ?: scmVars.GIT_LOCAL_BRANCH ?: scmVars.GIT_BRANCH

  def commit = sh(
    script: "cd kibana && git rev-parse HEAD",
    label: "determining checked out sha",
    returnStdout: true
  ).trim()

  def targetBranch = env.ghprbTargetBranch
  def mergeBase
  if (env.ghprbTargetBranch) {
    sh(
      script: "cd kibana && git fetch https://github.com/elastic/kibana.git ${env.ghprbTargetBranch}",
      label: "fetch latest from '${env.ghprbTargetBranch}' at https://github.com/elastic/kibana.git"
    )
    mergeBase = sh(
      script: "cd kibana && git merge-base HEAD FETCH_HEAD",
      label: "determining merge point with '${env.ghprbTargetBranch}' at https://github.com/elastic/kibana.git",
      returnStdout: true
    ).trim()
  }

  def repoInfo = [
    commit: commit,
    branch: branch,
    targetBranch: targetBranch,
    mergeBase: mergeBase,
  ]

  print "repoInfo: ${repoInfo}"

  return repoInfo
}

return this
