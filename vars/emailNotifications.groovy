def getFailedBuildParts() {
  def messages = [
    getFailedSteps(),
    getTestFailures(),
  ]

  return messages.findAll { !!it }.join("\n\n")
}

def getGitChanges() {
  def changes = []
  (currentBuild.changeSets ?: []).each { changeSet ->
    changeSet.items.each { changes << it }
  }

  def message = ["<div><strong>Changes</strong></div>"]

  message << changes.reverse().take(10).collect {
    "<div><a href=\"https://github.com/elastic/kibana/commit/${it.commitId}\">${it.msg}</a></div>\n<ul>"
  }.join("\n")

  if (changes.size() > 10) {
    message << "<li>...and ${changes.size()-10} more</li>"
  }

  message << "</ul>"

  return message.join("\n")
}

def getHeader() {
  def pipelinesUrl = "https://ci.kibana.dev/${env.JOB_BASE_NAME}/${env.BUILD_NUMBER}"

  def info = [
    ["Job", env.JOB_NAME],
    ["Status", buildUtils.getBuildStatus()],
    ["Duration", currentBuild.durationString.replace(' and counting', '')],
    ["Build URL", "<a href=\"${env.BUILD_URL}\">${env.BUILD_URL}</a>"],
    ["Pipelines UI", "<a href=\"${pipelinesUrl}\">${pipelinesUrl}</a>"],
    ["Build Cause", currentBuild.getBuildCauses().collect { "<div>${it.shortDescription}</div>" }.join("\n") ],
  ]

  def rows = info.collect { "<tr><td><strong>${it[0]}</strong>:&nbsp;</td><td>${it[1]}</td></tr>" }

  return """<table><tbody>
    ${rows.join("\n")}
  </tbody></table>"""

  // return """<p>
  //   <div><strong>Job</strong>: ${env.JOB_NAME}</div>
  //   <div><strong>Status</strong>: ${buildUtils.getBuildStatus()}</div>
  //   <div><strong>Duration</strong>: ${currentBuild.durationString.replace(' and counting', '')}</div>
  //   <div><strong>Build URL</strong>: <a href="${env.BUILD_URL}">${env.BUILD_URL}</a></div>
  //   <div><strong>Pipelines UI</strong>: <a href="${pipelinesUrl}">${pipelinesUrl}</a></div>
  // </p>"""
}

def getFailedSteps() {
  try {
    def steps = jenkinsApi.getFailedSteps()?.findAll { step ->
      step.displayName != 'Check out from version control'
    }

    if (steps?.size() > 0) {
      def list = steps.collect { """<li><a href="${it.logs}">${it.displayName}</a></li>""" }.join("\n")
      return "<p><strong>Failed Steps</strong></p><ul>${list}</ul>"
    }
  } catch (ex) {
    buildUtils.printStacktrace(ex)
    print "Error retrieving failed pipeline steps for message, will skip this section"
  }

  return ""
}

def getTestFailures() {
  def failures = testUtils.getFailures()
  if (!failures) {
    return ""
  }


  def list = failures.collect { """<li><a href="${it.url}">${it.fullDisplayName}</a></li>""" }.join("\n")
  return "<p><strong>Test Failures</strong></p>\n<ul>${list}</lu>"
}

def getDefaultJenkinsTemplate() {
  return '${SCRIPT,template="groovy-html.template"}'
}

def sendFailedBuild(Map params = [:]) {
  catchErrors {
    def subject = "${env.JOB_NAME} - Build ${env.BUILD_DISPLAY_NAME} - ${buildUtils.getBuildStatus()}"
    def body = [
      getHeader(),
      params.extra ?: '',
      getFailedBuildParts(),
      getGitChanges(),
    ]
      .findAll { !!it }
      .join("\n\n")

    def config = [
      // to: 'build-kibana@elastic.co',
      to: 'brian.seeders@elastic.co',
      subject: subject,
      body: body,
      mimeType: 'text/html',
    ] + params

    emailext(
      to: config.to,
      subject: config.subject,
      body: config.body,
      mimeType: config.mimeType,
    )
  }
}

def onFailure(Map options = [:], Closure closure) {
  // try/finally will NOT work here, because the build status will not have been changed to ERROR when the finally{} block executes
  catchError {
    closure()
  }

  def status = buildUtils.getBuildStatus()
  if (status != "SUCCESS" && status != "UNSTABLE") {
    catchErrors {
      sendFailedBuild(options)
    }
  }
}

return this
