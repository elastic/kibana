
def getSkippablePaths() {
  return [
    /^docs\//,
    /^rfcs\//,
    /^.ci\/.+\.yml$/,
    /^.ci\/es-snapshots\//,
    /^\.github\//,
    /\.md$/,
  ]
}

def areChangesSkippable() {
  if (!githubPr.isPr()) {
    return false
  }

  try {
    def skippablePaths = getSkippablePaths()
    def files = getChangedFiles()

    // 3000 is the max files GH API will return
    if (files.size() >= 3000) {
      return false
    }

    files = files.findAll { file ->
      return !skippablePaths.find { regex -> file =~ regex}
    }

    return files.size() < 1
  } catch (ex) {
    buildUtils.printStacktrace(ex)
    print "Error while checking to see if CI is skippable based on changes. Will run CI."
    return false
  }
}

def getChanges() {
  withGithubCredentials {
    return githubPrs.getChanges(env.ghprbPullId)
  }
}

def getChangedFiles() {
  def changes = getChanges()
  def changedFiles = changes.collect { it.filename }
  def renamedFiles = changes.collect { it.previousFilename }.findAll { it }

  return changedFiles + renamedFiles
}

return this
