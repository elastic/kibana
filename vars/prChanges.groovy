import groovy.transform.Field

public static @Field PR_CHANGES_CACHE = []

// if all the changed files in a PR match one of these regular
// expressions then CI will be skipped for that PR
def getSkippablePaths() {
  return [
    /^docs\//,
    /^rfcs\//,
    /^.ci\/.+\.yml$/,
    /^.ci\/es-snapshots\//,
    /^.ci\/pipeline-library\//,
    /^.ci\/Jenkinsfile_[^\/]+$/,
    /^\.github\//,
    /\.md$/,
  ]
}

// exclusion regular expressions that will invalidate paths that
// match one of the skippable path regular expressions
def getNotSkippablePaths() {
  return [
    // this file is auto-generated and changes to it need to be validated with CI
    /^docs\/developer\/plugin-list.asciidoc$/,
    // don't skip CI on prs with changes to plugin readme files (?i) is for case-insensitive matching
    /(?i)\/plugins\/[^\/]+\/readme\.(md|asciidoc)$/,
  ]
}

def areChangesSkippable() {
  if (!githubPr.isPr()) {
    return false
  }

  try {
    def skippablePaths = getSkippablePaths()
    def notSkippablePaths = getNotSkippablePaths()
    def files = getChangedFiles()

    // 3000 is the max files GH API will return
    if (files.size() >= 3000) {
      return false
    }

    files = files.findAll { file ->
      def skippable = skippablePaths.find { regex -> file =~ regex} && !notSkippablePaths.find { regex -> file =~ regex }
      return !skippable
    }

    return files.size() < 1
  } catch (ex) {
    buildUtils.printStacktrace(ex)
    print "Error while checking to see if CI is skippable based on changes. Will run CI."
    return false
  }
}

def getChanges() {
  if (!PR_CHANGES_CACHE && env.ghprbPullId) {
    withGithubCredentials {
      def changes = githubPrs.getChanges(env.ghprbPullId)
      if (changes) {
        PR_CHANGES_CACHE.addAll(changes)
      }
    }
  }

  return PR_CHANGES_CACHE
}

def getChangedFiles() {
  def changes = getChanges()
  def changedFiles = changes.collect { it.filename }
  def renamedFiles = changes.collect { it.previousFilename }.findAll { it }

  return changedFiles + renamedFiles
}

return this
