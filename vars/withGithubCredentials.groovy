def call(closure) {
  withCredentials([
    string(credentialsId: '2a9602aa-ab9f-4e52-baf3-b71ca88469c7', variable: 'GITHUB_TOKEN'),
  ]) {
    closure()
  }
}

return this
