def getFailedBuildBlocks() {
  def messages = [
    getFailedSteps(),
    getTestFailures(),
  ]

  return messages
    .findAll { !!it } // No blank strings
    .collect { markdownBlock(it) }
}

def dividerBlock() {
  return [ type: "divider" ]
}

def markdownBlock(message) {
  return [
    type: "section",
    text: [
      type: "mrkdwn",
      text: message,
    ],
  ]
}

def contextBlock(message) {
  return [
    type: "context",
    elements: [
      [
        type: 'mrkdwn',
        text: message,
      ]
    ]
  ]
}

def getFailedSteps() {
  try {
    def steps = jenkinsApi.getFailedSteps()?.findAll { step ->
      step.displayName != 'Check out from version control'
    }

    if (steps?.size() > 0) {
      def list = steps.collect { "• <${it.logs}|${it.displayName}>" }.join("\n")
      return "*Failed Steps*\n${list}"
    }
  } catch (ex) {
    buildUtils.printStacktrace(ex)
    print "Error retrieving failed pipeline steps for PR comment, will skip this section"
  }

  return ""
}

def getTestFailures() {
  def failures = testUtils.getFailures()
  if (!failures) {
    return ""
  }

  def messages = []
  messages << "*Test Failures*"

  def list = failures.collect {
    def name = it
      .fullDisplayName
      .split(/\./, 2)[-1]
      // Only the following three characters need to be escaped for link text, per Slack's docs
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')

    return "• <${it.url}|${name}>"
  }.join("\n")
  return "*Test Failures*\n${list}"
}

def getDefaultDisplayName() {
  return "${env.JOB_NAME} ${env.BUILD_DISPLAY_NAME}"
}

def getDefaultContext() {
  def duration = currentBuild.durationString.replace(' and counting', '')

  return contextBlock([
    "${buildUtils.getBuildStatus().toLowerCase().capitalize()} after ${duration}",
    "<https://ci.kibana.dev/${env.JOB_BASE_NAME}/${env.BUILD_NUMBER}|ci.kibana.dev>",
  ].join(' · '))
}

def getStatusIcon() {
  def status = buildUtils.getBuildStatus()
  if (status == 'UNSTABLE') {
    return ':yellow_heart:'
  }

  return ':broken_heart:'
}

def sendFailedBuild(Map params = [:]) {
  def config = [
    channel: '#kibana-operations-alerts',
    title: "*<${env.BUILD_URL}|${getDefaultDisplayName()}>*",
    message: getDefaultDisplayName(),
    color: 'danger',
    icon: ':jenkins:',
    username: 'Kibana Operations',
    context: getDefaultContext(),
  ] + params

  def title = "${getStatusIcon()} ${config.title}"
  def message = "${getStatusIcon()} ${config.message}"

  def blocks = [markdownBlock(title)]
  getFailedBuildBlocks().each { blocks << it }
  blocks << dividerBlock()
  blocks << config.context

  slackSend(
    channel: config.channel,
    username: config.username,
    iconEmoji: config.icon,
    color: config.color,
    message: message,
    blocks: blocks
  )
}

def onFailure(Map options = [:]) {
  catchError {
    def status = buildUtils.getBuildStatus()
    if (status != "SUCCESS") {
      catchErrors {
        sendFailedBuild(options)
      }
    }
  }
}

def onFailure(Map options = [:], Closure closure) {
  // try/finally will NOT work here, because the build status will not have been changed to ERROR when the finally{} block executes
  catchError {
    closure()
  }

  onFailure(options)
}

return this
