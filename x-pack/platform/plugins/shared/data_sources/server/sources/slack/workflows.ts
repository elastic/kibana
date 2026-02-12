/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * under one or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function generateSendMessageWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.slack.send_message'
description: 'Send a message to a Slack channel'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: channel
    type: string
    description: 'Channel ID, user ID, or conversation ID'
  - name: text
    type: string
  - name: thread_ts
    type: string
    required: false
  - name: unfurl_links
    type: boolean
    required: false
  - name: unfurl_media
    type: boolean
    required: false
steps:
  - name: send-message
    type: slack2.sendMessage
    connector-id: ${stackConnectorId}
    with:
      channel: "\${{inputs.channel}}"
      text: "\${{inputs.text}}"
      threadTs: "\${{inputs.thread_ts}}"
      unfurlLinks: \${{inputs.unfurl_links}}
      unfurlMedia: \${{inputs.unfurl_media}}
`;
}

