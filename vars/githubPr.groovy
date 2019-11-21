def isPr() {
  return !!(env.ghprbPullId && env.ghprbPullLink && env.ghprbPullLink =~ /\/elastic\/kibana\//)
}

def getCommitHash() {
  return env.ghprbActualCommit
}

def postComment(message) {
  if (!isPr()) {
    error "Trying to post a GitHub PR comment on a non-PR or non-elastic PR build"
  }

  withCredentials([
    string(credentialsId: '2a9602aa-ab9f-4e52-baf3-b71ca88469c7', variable: 'GITHUB_TOKEN'),
  ]) {
    return githubApi.post("repos/elastic/kibana/issues/${env.ghprbPullId}/comments", [ body: message ])
  }
}

def getComments() {
  withCredentials([
    string(credentialsId: '2a9602aa-ab9f-4e52-baf3-b71ca88469c7', variable: 'GITHUB_TOKEN'),
  ]) {
    return githubApi.get("repos/elastic/kibana/issues/${env.ghprbPullId}/comments")
  }
}

def getLatestPipelineComment() {
  return getComments()
    .reverse()
    .find { it.user.login == 'elasticmachine' && it.body =~ /<!--PIPELINE/ }
}

def getPipelineInfoFromComment(comment) {
  def matches = comment =~ /(?ms)<!--PIPELINE(.*?)PIPELINE-->/
  if (!matches || !matches[0]) {
    return null
  }

  return toJSON(matches[0][1].trim())
}

def getLatestPipelineInfo() {
  return getLatestPipelineInfo(getLatestPipelineComment())
}

def getLatestPipelineInfo(comment) {
  def info

  if (comment) {
    info = getPipelineInfoFromComment(comment)
  }

  return info ?: [ builds: [] ]
}

def createBuildInfo() {
  return [
    status: buildUtils.getBuildStatus(),
    url: env.BUILD_URL,
    number: env.BUILD_NUMBER,
    commit: getCommitHash()
  ]
}

def deleteComment(commentId) {
  withCredentials([
    string(credentialsId: '2a9602aa-ab9f-4e52-baf3-b71ca88469c7', variable: 'GITHUB_TOKEN'),
  ]) {
    // TODO - verification that this is an elasticmachine comment or similar?
    def path = "repos/elastic/kibana/issues/comments/${commentId}"
    return githubApi([ path: path ], [ method: "DELETE" ])
  }
}

def getHistoryText(builds) {
  if (!builds || builds.size() < 1) {
    return ""
  }

  def list = builds
    .reverse()
    .collect { build ->
      if (build.status == "SUCCESS") {
        return "* :green_heart: [Build #${build.number}](${build.url}) succeeded ${build.commit}"
      } else {
        return "* :broken_heart: [Build #${build.number}](${build.url}) failed ${build.commit}"
      }
    }
    .join("\n")

  return "### History\n${list}"
}

def withDefaultPrComments(closure) {
  catchError {
    catchError {
      closure()
    }

    if (!isPr()) {
      return
    }

    def status = buildUtils.getBuildStatus()
    if (status == "ABORTED") {
      return;
    }

    def lastComment = getLatestPipelineComment()
    def info = getLatestPipelineInfo(lastComment)
    info.builds = (info.builds ?: []).takeRight(5) // Rotate out old builds

    def messages = []

    if (status == 'SUCCESS') {
      messages << """
        ## :green_heart: Build Succeeded
        * [continuous-integration/kibana-ci/pull-request](${env.BUILD_URL})
        * Commit: ${getCommitHash()}
      """
    } else {
      messages << """
        ## :broken_heart: Build Failed
        * [continuous-integration/kibana-ci/pull-request](${env.BUILD_URL})
        * Commit: ${getCommitHash()}
      """
    }

    if (info.builds && info.builds.size() > 0) {
      messages << getHistoryText(info.builds)
    }

    messages << "To update your PR or re-run it, just comment with:\n`@elasticmachine merge upstream`"

    info.builds << createBuildInfo()

    messages << """
      <!--PIPELINE
      ${toJSON(info).toString()}
      PIPELINE-->
    """

    def message = messages
      .findAll { !!it } // No blank strings
      .collect { it.stripIndent().trim() }
      .join("\n\n")

    postComment(message)

    if (lastComment) {
      deleteComment(lastComment.id)
    }
  }
}
