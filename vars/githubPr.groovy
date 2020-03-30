/**
  Wraps the main/important part of a job, executes it, and then publishes a comment to GitHub with the status.

  It will check for the existence of GHPRB env variables before doing any actual PR work,
    so it can be used to wrap code that is executed in both PR and non-PR contexts.

  Inside the comment, it will hide a JSON blob containing build data (status, etc).

  Then, the next time it posts a comment, it will:
    1. Read the previous comment and parse the json
    2. Create a new comment, add a summary of up to 5 previous builds to it, and append this build's data to the hidden JSON
    3. Delete the old comment

  So, there is only ever one build status comment on a PR at any given time, the most recent one.
*/
def withDefaultPrComments(closure) {
  catchErrors {
    catchErrors {
      closure()
    }

    if (!params.ENABLE_GITHUB_PR_COMMENTS || !isPr()) {
      return
    }

    def status = buildUtils.getBuildStatus()
    if (status == "ABORTED") {
      return;
    }

    def lastComment = getLatestBuildComment()
    def info = getLatestBuildInfo(lastComment) ?: [:]
    info.builds = (info.builds ?: []).takeRight(5) // Rotate out old builds

    def message = getNextCommentMessage(info)
    postComment(message)

    if (lastComment && lastComment.user.login == 'kibanamachine') {
      deleteComment(lastComment.id)
    }
  }
}

// Checks whether or not this currently executing build was triggered via a PR in the elastic/kibana repo
def isPr() {
  return !!(env.ghprbPullId && env.ghprbPullLink && env.ghprbPullLink =~ /\/elastic\/kibana\//)
}

def getLatestBuildComment() {
  return getComments()
    .reverse()
    .find { (it.user.login == 'elasticmachine' || it.user.login == 'kibanamachine') && it.body =~ /<!--PIPELINE/ }
}

def getBuildInfoFromComment(commentText) {
  def matches = commentText =~ /(?ms)<!--PIPELINE(.*?)PIPELINE-->/
  if (!matches || !matches[0]) {
    return null
  }

  return toJSON(matches[0][1].trim())
}

def getLatestBuildInfo() {
  return getLatestBuildInfo(getLatestBuildComment())
}

def getLatestBuildInfo(comment) {
  return comment ? getBuildInfoFromComment(comment) : null
}

def createBuildInfo() {
  return [
    status: buildUtils.getBuildStatus(),
    url: env.BUILD_URL,
    number: env.BUILD_NUMBER,
    commit: getCommitHash()
  ]
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
      } else if(build.status == "UNSTABLE") {
        return "* :yellow_heart: [Build #${build.number}](${build.url}) was flaky ${build.commit}"
      } else {
        return "* :broken_heart: [Build #${build.number}](${build.url}) failed ${build.commit}"
      }
    }
    .join("\n")

  return "### History\n${list}"
}

def getTestFailuresMessage() {
  def failures = testUtils.getFailures()
  if (!failures) {
    return ""
  }

  def messages = []
  messages << "---\n\n### [Test Failures](${env.BUILD_URL}testReport)"

  failures.take(3).each { failure ->
    messages << """
<details><summary>${failure.fullDisplayName}</summary>

[Link to Jenkins](${failure.url})
"""

    if (failure.stdOut) {
      messages << "\n#### Standard Out\n```\n${failure.stdOut}\n```"
    }

    if (failure.stdErr) {
      messages << "\n#### Standard Error\n```\n${failure.stdErr}\n```"
    }

    if (failure.stacktrace) {
      messages << "\n#### Stack Trace\n```\n${failure.stacktrace}\n```"
    }

    messages << "</details>\n\n---"
  }

  if (failures.size() > 3) {
    messages << "and ${failures.size() - 3} more failures, only showing the first 3."
  }

  return messages.join("\n")
}

def getNextCommentMessage(previousCommentInfo = [:]) {
  def info = previousCommentInfo ?: [:]
  info.builds = previousCommentInfo.builds ?: []

  def messages = []
  def status = buildUtils.getBuildStatus()

  if (status == 'SUCCESS') {
    messages << """
      ## :green_heart: Build Succeeded
      * [continuous-integration/kibana-ci/pull-request](${env.BUILD_URL})
      * Commit: ${getCommitHash()}
    """
  } else if(status == 'UNSTABLE') {
    def message = """
      ## :yellow_heart: Build succeeded, but was flaky
      * [continuous-integration/kibana-ci/pull-request](${env.BUILD_URL})
      * Commit: ${getCommitHash()}
    """.stripIndent()

    def failures = retryable.getFlakyFailures()
    if (failures && failures.size() > 0) {
      def list = failures.collect { "  * ${it.label}" }.join("\n")
      message += "* Flaky suites:\n${list}"
    }

    messages << message
  } else {
    messages << """
      ## :broken_heart: Build Failed
      * [continuous-integration/kibana-ci/pull-request](${env.BUILD_URL})
      * Commit: ${getCommitHash()}
      * [Pipeline Steps](${env.BUILD_URL}flowGraphTable) (look for red circles / failed steps)
      * [Interpreting CI Failures](https://www.elastic.co/guide/en/kibana/current/interpreting-ci-failures.html)
    """

    try {
      def steps = getFailedSteps()
      if (steps?.size() > 0) {
        def list = steps.collect { "* [${it.displayName}](${it.logs})" }.join("\n")
        messages << "### Failed CI Steps\n${list}"
      }
    } catch (ex) {
      buildUtils.printStacktrace(ex)
      print "Error retrieving failed pipeline steps for PR comment, will skip this section"
    }
  }

  messages << getTestFailuresMessage()

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

  return messages
    .findAll { !!it } // No blank strings
    .collect { it.stripIndent().trim() } // This just allows us to indent various strings above, but leaves them un-indented in the comment
    .join("\n\n")
}

def postComment(message) {
  if (!isPr()) {
    error "Trying to post a GitHub PR comment on a non-PR or non-elastic PR build"
  }

  withGithubCredentials {
    return githubApi.post("repos/elastic/kibana/issues/${env.ghprbPullId}/comments", [ body: message ])
  }
}

def getComments() {
  withGithubCredentials {
    return githubIssues.getComments(env.ghprbPullId)
  }
}

def deleteComment(commentId) {
  withGithubCredentials {
    def path = "repos/elastic/kibana/issues/comments/${commentId}"
    return githubApi([ path: path ], [ method: "DELETE" ])
  }
}

def getCommitHash() {
  return env.ghprbActualCommit
}

def getFailedSteps() {
  return jenkinsApi.getFailedSteps()?.findAll { step ->
    step.displayName != 'Check out from version control'
  }
}
