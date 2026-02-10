/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * under one or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function generateListConversationsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.slack.list_conversations'
description: 'List Slack conversations (channels/DMs) available to the authorized token'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: types
    type: string
    required: false
    description: 'Comma-separated conversation types (public_channel,private_channel,im,mpim)'
  - name: exclude_archived
    type: boolean
    required: false
    default: true
  - name: limit
    type: number
    required: false
    default: 100
  - name: cursor
    type: string
    required: false
steps:
  - name: list-conversations
    type: slack2.listConversations
    connector-id: ${stackConnectorId}
    with:
      types: "\${{inputs.types}}"
      excludeArchived: \${{inputs.exclude_archived}}
      limit: \${{inputs.limit}}
      cursor: "\${{inputs.cursor}}"
`;
}

export function generateGetConversationHistoryWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.slack.get_conversation_history'
description: 'Fetch message history for a specific Slack conversation'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: channel
    type: string
    description: 'Conversation ID (e.g. C123..., G123..., D123...)'
  - name: oldest
    type: string
    required: false
    description: 'Start of time range (Unix timestamp as string)'
  - name: latest
    type: string
    required: false
    description: 'End of time range (Unix timestamp as string)'
  - name: inclusive
    type: boolean
    required: false
    default: false
  - name: limit
    type: number
    required: false
    default: 100
  - name: cursor
    type: string
    required: false
steps:
  - name: get-conversation-history
    type: slack2.getConversationHistory
    connector-id: ${stackConnectorId}
    with:
      channel: "\${{inputs.channel}}"
      oldest: "\${{inputs.oldest}}"
      latest: "\${{inputs.latest}}"
      inclusive: \${{inputs.inclusive}}
      limit: \${{inputs.limit}}
      cursor: "\${{inputs.cursor}}"
`;
}

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

