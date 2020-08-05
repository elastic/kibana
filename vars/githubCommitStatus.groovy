def defaultCommit() {
  if (buildState.has('checkoutInfo')) {
    return buildState.get('checkoutInfo').commit
  }
}

def onStart(commit = defaultCommit(), context = 'kibana-ci') {
  catchError {
    if (githubPr.isPr() || !commit) {
      return
    }

    create(commit, 'pending', 'Build started.', context)
  }
}

def onFinish(commit = defaultCommit(), context = 'kibana-ci') {
  catchError {
    if (githubPr.isPr() || !commit) {
      return
    }

    def status = buildUtils.getBuildStatus()

    if (status == 'SUCCESS' || status == 'UNSTABLE') {
      create(commit, 'success', 'Build completed successfully.', context)
    } else if(status == 'ABORTED') {
      create(commit, 'error', 'Build aborted or timed out.', context)
    } else {
      create(commit, 'error', 'Build failed.', context)
    }
  }
}

def trackBuild(commit, context, Closure closure) {
  onStart(commit, context)
  catchError {
    closure()
  }
  onFinish(commit, context)
}

// state: error|failure|pending|success
def create(sha, state, description, context) {
  withGithubCredentials {
    return githubApi.post("repos/elastic/kibana/statuses/${sha}", [
      state: state,
      description: description,
      context: context,
      target_url: env.BUILD_URL
    ])
  }
}

return this
