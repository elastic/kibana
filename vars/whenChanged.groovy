/*
  whenChanged('some/path') { yourCode() } can be used to execute pipeline code in PRs only when changes are detected on paths that you specify.
  The specified code blocks will also always be executed during the non-PR jobs for tracked branches.

  You have the option of passing in path prefixes, or regexes. Single or multiple.
  Path specifications are NOT globby, they are only prefixes.
  Specifying multiple will treat them as ORs.

  Example Usages:
    whenChanged('a/path/prefix/') { someCode() }
    whenChanged(startsWith: 'a/path/prefix/') { someCode() } // Same as above
    whenChanged(['prefix1/', 'prefix2/']) { someCode() }
    whenChanged(regex: /\.test\.js$/) { someCode() }
    whenChanged(regex: [/abc/, /xyz/]) { someCode() }
*/

def call(String startsWithString, Closure closure) {
  return whenChanged([ startsWith: startsWithString ], closure)
}

def call(List<String> startsWithStrings, Closure closure) {
  return whenChanged([ startsWith: startsWithStrings ], closure)
}

def call(Map params, Closure closure) {
  if (!githubPr.isPr()) {
    return closure()
  }

  def files = prChanges.getChangedFiles()
  def hasMatch = false

  if (params.regex) {
    params.regex = [] + params.regex
    print "Checking PR for changes that match: ${params.regex.join(', ')}"
    hasMatch = !!files.find { file ->
      params.regex.find { regex -> file =~ regex }
    }
  }

  if (!hasMatch && params.startsWith) {
    params.startsWith = [] + params.startsWith
    print "Checking PR for changes that start with: ${params.startsWith.join(', ')}"
    hasMatch = !!files.find { file ->
      params.startsWith.find { str -> file.startsWith(str) }
    }
  }

  if (hasMatch) {
    print "Changes found, executing pipeline."
    closure()
  } else {
    print "No changes found, skipping."
  }
}

return this
