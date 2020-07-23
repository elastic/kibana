def shouldCreateStatuses() {
  return !githubPr.isPr() && buildState.get('checkoutInfo')
}

def onStart() {
  catchError {
    if (!shouldCreateStatuses()) {
      return
    }

    def checkoutInfo = buildState.get('checkoutInfo')
    create(checkoutInfo.commit, 'pending', 'Build started.')
  }
}

def onFinish() {
  catchError {
    if (!shouldCreateStatuses()) {
      return
    }

    def checkoutInfo = buildState.get('checkoutInfo')
    def status = buildUtils.getBuildStatus()

    if (status == 'SUCCESS' || status == 'UNSTABLE') {
      create(checkoutInfo.commit, 'success', 'Build completed successfully.')
    } else if(status == 'ABORTED') {
      create(checkoutInfo.commit, 'error', 'Build aborted or timed out.')
    } else {
      create(checkoutInfo.commit, 'error', 'Build failed.')
    }
  }
}

// state: error|failure|pending|success
def create(sha, state, description, context = 'kibana-ci') {
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
