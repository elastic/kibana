def call(String startsWithString, Closure closure) {
  return whenChanged([ startsWith: startsWithString ], closure)
}

def call(Map params, Closure closure) {
  if (!githubPr.isPr()) {
    return closure()
  }

  def files = prChanges.getChangedFiles()
  def hasMatch = false

  if (params.regex) {
    print "Checking PR for changes that match: ${params.regex}"
    hasMatch = !!files.find { file -> file =~ params.regex }
  }

  if (!hasMatch && params.startsWith) {
    print "Checking PR for changes that start with: ${params.startsWith}"
    hasMatch = !!files.find { file -> file =~ file.startsWith(params.startsWith) }
  }

  if (hasMatch) {
    print "Changes found, executing pipeline."
    closure()
  } else {
    print "No changes found, skipping."
  }
}

return this
