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

  def list = failures.collect { "• <${it.url}|${it.fullDisplayName}>" }.join("\n")
  return "*Test Failures*\n${list}"
}

def sendFailedBuild(Map params = [:]) {
  def displayName = "${env.JOB_NAME} ${env.BUILD_DISPLAY_NAME}"

  def config = [
    channel: '#kibana-operations',
    title: ":broken_heart: *<${env.BUILD_URL}|${displayName}>*",
    message: ":broken_heart: ${displayName}",
    color: 'danger',
    icon: ':jenkins:',
    username: 'Kibana Operations',
    context: contextBlock("${displayName} · <https://ci.kibana.dev/${env.JOB_BASE_NAME}/${env.BUILD_NUMBER}|ci.kibana.dev>"),
  ] + params

  def blocks = [markdownBlock(config.title)]
  getFailedBuildBlocks().each { blocks << it }
  blocks << dividerBlock()
  blocks << config.context

  slackSend(
    channel: config.channel,
    username: config.username,
    iconEmoji: config.icon,
    color: config.color,
    message: config.message,
    blocks: blocks
  )
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
