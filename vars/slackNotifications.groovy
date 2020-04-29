def getFailedBuildBlocks() {
  def messages = [
    getFailedSteps(),
    getTestFailures(),
  ]

  return messages
    .findAll { !!it } // No blank strings
    .collect { getMarkdownBlock(it) }
    // .inject([]) { items, item ->
    //   items == [] ? [item] : items + [getDividerBlock()] + [item] // Add dividers between sections
    // }
}

def getDividerBlock() {
  return [ type: "divider" ]
}

def getMarkdownBlock(message) {
  return [
    type: "section",
    text: [
      type: "mrkdwn",
      text: message,
    ],
  ]
}

def getContextBlock(message) {
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

def sendFailedBuild(Map params = [:]) {
  def displayName = "${env.JOB_NAME} ${env.BUILD_DISPLAY_NAME}"

  def config = [
    channel: '@brian.seeders',
    // channel: '#kibana-operations-hang',
    title: ":broken_heart: *<${env.BUILD_URL}|${displayName}>*",
    message: ":broken_heart: ${displayName}",
    color: "danger",
    icon: ":jenkins:",
    username: "Kibana Operations",
    context: getContextBlock("${displayName} · <https://ci.kibana.dev/${env.JOB_BASE_NAME}/${env.BUILD_NUMBER}|ci.kibana.dev>"),
  ] + params

  def blocks = [getMarkdownBlock(config.title)]
  getFailedBuildBlocks().each { blocks << it }
  blocks << getDividerBlock()
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

  def list = failures.collect { "• <${failure.url}|${failure.fullDisplayName}>" }.join("\n")
  return "*Test Failures*\n${list}"
}

def onFailure(Map options = [:], Closure closure) {
  try {
    closure()
  } finally {
    def status = buildUtils.getBuildStatus()
    if (status != "SUCCESS" && status != "UNSTABLE") {
      catchErrors {
        sendFailedBuild(options)
      }
    }
  }
}

return this
