/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const alertWorkflowExample = `# Alert Workflow Example

This is a reference example of a workflow that receives alert notifications. Use this as a template when creating workflows for alert-kind rules.

## Key Structure

An alert workflow needs:
1. A \`manual\` trigger (the Dispatcher invokes workflows via the manual trigger when episodes match a notification policy)
2. An \`inputs\` schema that accepts the notification group payload (id, ruleId, policyId, groupKey, episodes)
3. Steps that process the episodes — typically iterating over them with \`foreach\`

## Inputs Schema

The Dispatcher sends the following inputs when triggering a workflow:

- \`id\` (string) — Unique identifier of the notification group
- \`ruleId\` (string) — Identifier of the rule that produced this notification group
- \`policyId\` (string) — Identifier of the notification policy that matched and dispatched the group
- \`groupKey\` (object) — Grouping key for the notification group
- \`episodes\` (array) — Alert episodes included in this group, each containing:
  - \`last_event_timestamp\` (date-time) — Timestamp of the latest event
  - \`rule_id\` (string) — Rule identifier
  - \`group_hash\` (string) — Alert series/group hash
  - \`episode_id\` (string) — Unique episode identifier
  - \`episode_status\` (string) — One of: inactive, pending, active, recovering

## Complete Example

\`\`\`yaml
version: "1"
name: Alert Notification Workflow
description: Processes alert episodes and sends notifications
enabled: true

triggers:
  - type: manual

inputs:
  properties:
    id:
      type: string
      description: Unique identifier of the notification group
    ruleId:
      type: string
      description: Identifier of the rule that produced this notification group
    policyId:
      type: string
      description: Identifier of the notification policy that matched and dispatched the group
    groupKey:
      type: object
      description: Grouping key for the notification group
      additionalProperties: true
    episodes:
      type: array
      description: Alert episodes included in this notification group
      items:
        type: object
        properties:
          last_event_timestamp:
            type: string
            format: date-time
            description: Timestamp of the latest event seen for this episode
          rule_id:
            type: string
            description: Identifier of the rule that produced this episode
          group_hash:
            type: string
            description: Hash identifying the alert series/group this episode belongs to
          episode_id:
            type: string
            description: Unique identifier of the alert episode
          episode_status:
            type: string
            description: Current lifecycle status of the alert episode
            enum:
              - inactive
              - pending
              - active
              - recovering
        required:
          - last_event_timestamp
          - rule_id
          - group_hash
          - episode_id
          - episode_status
        additionalProperties: false
  required:
    - id
    - ruleId
    - policyId
    - groupKey
    - episodes
  additionalProperties: false

steps:
  - name: log_group_summary
    type: console
    with:
      message: "Notification group {{ inputs.id }} for policy {{ inputs.policyId }} has {{ inputs.episodes | size }} episode(s)"

  - name: for_each_episode
    type: foreach
    foreach: "{{ inputs.episodes | json }}"
    steps:
      - name: handle_active
        type: console
        if: "\${{ foreach.item.episode_status == 'active' }}"
        with:
          message: "ACTIVE alert for rule {{ inputs.ruleId }} - episode {{ foreach.item.episode_id }} - group {{ foreach.item.group_hash }}"

      - name: handle_recovered
        type: console
        if: "\${{ foreach.item.episode_status == 'inactive' }}"
        with:
          message: "RECOVERED alert for rule {{ inputs.ruleId }} - episode {{ foreach.item.episode_id }} - group {{ foreach.item.group_hash }}"

      - name: handle_other
        type: console
        if: "\${{ foreach.item.episode_status == 'pending' or foreach.item.episode_status == 'recovering' }}"
        with:
          message: "{{ foreach.item.episode_status }} alert for rule {{ inputs.ruleId }} - episode {{ foreach.item.episode_id }} - group {{ foreach.item.group_hash }}"
\`\`\`

## Adapting for Real Notifications

To send actual notifications instead of console logs, replace the \`console\` steps inside \`for_each_episode\` with connector steps. For example, to send a Slack message for active episodes:

\`\`\`yaml
      - name: notify_slack
        type: slack
        connector-id: my-slack-connector
        if: "\${{ foreach.item.episode_status == 'active' }}"
        with:
          message: "Alert fired for rule {{ inputs.ruleId }} — episode {{ foreach.item.episode_id }} is now active"
\`\`\`

Use \`get_connectors\` to find the connector ID for the user's configured Slack (or email, PagerDuty, etc.) instance.
`;
