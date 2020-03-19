def call(String regex, Closure closure) {
  if (!githubPr.isPr()) {
    return closure()
  }

  print "Checking PR for changes that match: ${regex}"

  def files = prChanges.getChangedFiles()
  def hasMatch = !!files.find { file -> file =~ regex }

  if (hasMatch) {
    print "Changes found, executing pipeline."
    closure()
  } else {
    print "No changes found, skipping."
  }
}

return this
