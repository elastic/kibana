def isPr() {
  return env.ghprbPullId && env.ghprbPullLink && env.ghprbPullLink ==~ /\/elastic\/kibana\//
}

def getCommitHash() {
  return env.ghprbActualCommit
}

def postComment(message) {
  if (!isPr()) {
    error "Trying to post a GitHub PR comment on a non-PR or non-elastic PR build"
  }

  return githubApi.post("repos/elastic/kibana/issues/${env.ghprbPullId}/comments", [ body: message ])
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

    if (status != 'ABORTED') {
      def message

      if (status == 'SUCCESS') {
        message = """
          ## :green_heart: Build Succeeded
          * [continuous-integration/kibana-ci/pull-request](${env.BUILD_URL})
          * Commit: ${getCommitHash()}
        """
      } else {
        message = """
          ## :broken_heart: Build Failed
          * [continuous-integration/kibana-ci/pull-request](${env.BUILD_URL})
          * Commit: ${getCommitHash()}
        """
      }

      postComment(message.trim().stripIndent())
    }
  }
}
