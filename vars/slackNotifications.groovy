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

// If a message is longer than the limit, split it up by '\n' into parts, and return as many parts as will fit within the limit
def shortenMessage(message, sizeLimit = 3000) {
  if (message.size() <= sizeLimit) {
    return message
  }

  def truncatedMessage = "[...truncated...]"

  def parts = message.split("\n")
  message = ""

  for(def part in parts) {
    if ((message.size() + part.size() + truncatedMessage.size() + 1) > sizeLimit) {
      break;
    }
    message += part+"\n"
  }

  message += truncatedMessage

  return message.size() <= sizeLimit ? message : truncatedMessage
}

def markdownBlock(message) {
  return [
    type: "section",
    text: [
      type: "mrkdwn",
      text: shortenMessage(message, 3000), // 3000 is max text length for `section`s only
    ],
  ]
}

def contextBlock(message) {
  return [
    type: "context",
    elements: [
      [
        type: 'mrkdwn',
        text: message, // Not sure what the size limit is here, I tried 10000s of characters and it still worked
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

  def list = failures.take(10).collect {
    def name = it
      .fullDisplayName
      .split(/\./, 2)[-1]
      // Only the following three characters need to be escaped for link text, per Slack's docs
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')

    return "• <${it.url}|${name}>"
  }.join("\n")

  def moreText = failures.size() > 10 ? "\n• ...and ${failures.size()-10} more" : ""
  return "*Test Failures*\n${list}${moreText}"
}

def getDefaultDisplayName() {
  return "${env.JOB_NAME} ${env.BUILD_DISPLAY_NAME}"
}

def getDefaultContext(config = [:]) {
  def progressMessage = ""
  if (config && !config.isFinal) {
    progressMessage = "In-progress"
  } else {
    def duration = currentBuild.durationString.replace(' and counting', '')
    progressMessage = "${buildUtils.getBuildStatus().toLowerCase().capitalize()} after ${duration}"
  }

  return contextBlock([
    progressMessage,
    "<https://ci.kibana.dev/${env.JOB_BASE_NAME}/${env.BUILD_NUMBER}|ci.kibana.dev>",
  ].join(' · '))
}

def getStatusIcon(config = [:]) {
  if (config && !config.isFinal) {
    return ':hourglass_flowing_sand:'
  }

  def status = buildUtils.getBuildStatus()
  if (status == 'UNSTABLE') {
    return ':yellow_heart:'
  }

  return ':broken_heart:'
}

def getBackupMessage(config) {
  return "${getStatusIcon(config)} ${config.title}\n\nFirst attempt at sending this notification failed. Please check the build."
}

def sendFailedBuild(Map params = [:]) {
  def config = [
    channel: '#kibana-operations-alerts',
    title: "*<${env.BUILD_URL}|${getDefaultDisplayName()}>*",
    message: getDefaultDisplayName(),
    color: 'danger',
    icon: ':jenkins:',
    username: 'Kibana Operations',
    isFinal: false,
  ] + params

  config.context = config.context ?: getDefaultContext(config)

  def title = "${getStatusIcon(config)} ${config.title}"
  def message = "${getStatusIcon(config)} ${config.message}"

  def blocks = [markdownBlock(title)]
  getFailedBuildBlocks().each { blocks << it }
  blocks << dividerBlock()
  blocks << config.context

  def channel = config.channel
  def timestamp = null

  def previousResp = buildState.get('SLACK_NOTIFICATION_RESPONSE')
  if (previousResp) {
    // When using `timestamp` to update a previous message, you have to use the channel ID from the previous response
    channel = previousResp.channelId
    timestamp = previousResp.ts
  }

  def resp = slackSend(
    channel: channel,
    timestamp: timestamp,
    username: config.username,
    iconEmoji: config.icon,
    color: config.color,
    message: message,
    blocks: blocks
  )

  if (!resp) {
    resp = slackSend(
      channel: config.channel,
      username: config.username,
      iconEmoji: config.icon,
      color: config.color,
      message: message,
      blocks: [markdownBlock(getBackupMessage(config))]
    )
  }

  if (resp) {
    buildState.set('SLACK_NOTIFICATION_RESPONSE', resp)
  }
}

def onFailure(Map options = [:]) {
  catchError {
    def status = buildUtils.getBuildStatus()
    if (status != "SUCCESS") {
      catchErrors {
        options.isFinal = true
        sendFailedBuild(options)
      }
    }
  }
}

def onFailure(Map options = [:], Closure closure) {
  if (options.disabled) {
    catchError {
      closure()
    }

    return
  }

  buildState.set('SLACK_NOTIFICATION_CONFIG', options)

  // try/finally will NOT work here, because the build status will not have been changed to ERROR when the finally{} block executes
  catchError {
    closure()
  }

  onFailure(options)
}

return this
