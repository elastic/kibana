/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const alertWorkflowExample = `# Alert Notification Workflow Reference

## Workflow YAML Structure for Alert Notifications

Alert notification workflows are YAML definitions that the Dispatcher invokes when alert episodes match a notification policy. Every alert notification workflow MUST follow this structure.

### Required Top-Level Fields

\`\`\`yaml
version: "1"
name: Descriptive Workflow Name
description: What this workflow does
enabled: true

triggers:
  - type: manual

inputs:
  # REQUIRED: the notification dispatcher payload schema (see below)

steps:
  # Steps that process episodes and send notifications
\`\`\`

### CRITICAL Requirements

1. **Trigger MUST be \`manual\`** — the Dispatcher invokes workflows via the manual trigger when episodes match a notification policy. Do NOT use \`alert\` or \`scheduled\` triggers for notification workflows.
2. **Inputs schema is MANDATORY** — the Dispatcher sends a fixed payload. The workflow must declare the exact inputs schema shown below, or it will fail at runtime.
3. **Use connector steps for notifications** — use \`type: slack\`, \`type: email\`, \`type: pagerduty\`, etc. with a \`connector-id\`. NEVER use raw \`http\` steps for integrations that have a connector type. Call \`get_step_definitions\` with \`stepType\` to discover the exact \`with\` parameters.
4. **Call \`get_connectors\`** to find the connector ID for the user's configured connector instance.
5. **Always validate** — call \`validate_workflow\` with the complete YAML before proposing. If validation fails, fix errors and re-validate.

### Required Inputs Schema

The Dispatcher sends this payload when triggering the workflow. Copy this exactly:

\`\`\`yaml
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
\`\`\`

### Connector Step Pattern

Connector-based steps use the connector name as the step \`type\` and require a \`connector-id\`:

\`\`\`yaml
- name: unique_step_name
  type: <connector_type>       # e.g. slack, email, pagerduty
  connector-id: <connector_id> # from get_connectors
  if: "<optional condition>"   # e.g. "\${{ foreach.item.episode_status == 'active' }}"
  with:
    # Input parameters specific to the connector type
    # Use get_step_definitions with stepType to discover these
\`\`\`

### Common Step Properties

Every step supports these optional fields:
- \`if\`: Skip step when condition is falsy (e.g. \`"\${{ foreach.item.episode_status == 'active' }}"\`)
- \`timeout\`: Step-level timeout (e.g. \`"30s"\`)
- \`on-failure\`: Error handling with \`retry\`, \`fallback\`, and \`continue\`

### Liquid Templating

Use Liquid syntax for dynamic values in \`with\` parameters:
- \`{{ inputs.ruleId }}\` — reference workflow inputs
- \`{{ foreach.item.episode_id }}\` — current item in a foreach loop
- \`{{ inputs.episodes | size }}\` — array size filter
- \`{{ value | json }}\` — convert to JSON string
- \`{{ value | default: "fallback" }}\` — default if nil

### Iterating Over Episodes

Use a \`foreach\` step to process each episode:

\`\`\`yaml
- name: for_each_episode
  type: foreach
  foreach: "{{ inputs.episodes | json }}"
  steps:
    - name: notify_active
      type: <connector_type>
      connector-id: <connector_id>
      if: "\${{ foreach.item.episode_status == 'active' }}"
      with:
        # connector-specific params with Liquid references to foreach.item
\`\`\`

## Complete Examples

### Slack Notification Workflow

\`\`\`yaml
version: "1"
name: Slack Alert Notifications
description: Sends Slack messages when alert episodes become active or recover
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
          rule_id:
            type: string
          group_hash:
            type: string
          episode_id:
            type: string
          episode_status:
            type: string
            enum: [inactive, pending, active, recovering]
        required: [last_event_timestamp, rule_id, group_hash, episode_id, episode_status]
        additionalProperties: false
  required: [id, ruleId, policyId, groupKey, episodes]
  additionalProperties: false

steps:
  - name: for_each_episode
    type: foreach
    foreach: "{{ inputs.episodes | json }}"
    steps:
      - name: notify_active
        type: slack
        connector-id: <YOUR_SLACK_CONNECTOR_ID>
        if: "\${{ foreach.item.episode_status == 'active' }}"
        with:
          message: "🚨 Alert fired for rule {{ inputs.ruleId }} — episode {{ foreach.item.episode_id }} is now ACTIVE (group: {{ foreach.item.group_hash }})"

      - name: notify_recovered
        type: slack
        connector-id: <YOUR_SLACK_CONNECTOR_ID>
        if: "\${{ foreach.item.episode_status == 'inactive' }}"
        with:
          message: "✅ Alert recovered for rule {{ inputs.ruleId }} — episode {{ foreach.item.episode_id }} is now inactive"
\`\`\`

**Slack \`with\` parameters:**
- \`message\` (string, required) — the message text
- \`channel\` (string, optional) — override the default channel
- \`username\` (string, optional) — override the bot username
- \`icon_emoji\` (string, optional) — override the bot icon

### Email Notification Workflow

\`\`\`yaml
version: "1"
name: Email Alert Notifications
description: Sends email notifications when alert episodes become active
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
          rule_id:
            type: string
          group_hash:
            type: string
          episode_id:
            type: string
          episode_status:
            type: string
            enum: [inactive, pending, active, recovering]
        required: [last_event_timestamp, rule_id, group_hash, episode_id, episode_status]
        additionalProperties: false
  required: [id, ruleId, policyId, groupKey, episodes]
  additionalProperties: false

steps:
  - name: for_each_episode
    type: foreach
    foreach: "{{ inputs.episodes | json }}"
    steps:
      - name: email_active
        type: email
        connector-id: <YOUR_EMAIL_CONNECTOR_ID>
        if: "\${{ foreach.item.episode_status == 'active' }}"
        with:
          to:
            - "oncall@example.com"
          subject: "Alert fired: rule {{ inputs.ruleId }} — episode {{ foreach.item.episode_id }}"
          message: "Alert episode {{ foreach.item.episode_id }} for rule {{ inputs.ruleId }} transitioned to ACTIVE at {{ foreach.item.last_event_timestamp }}.\\n\\nGroup hash: {{ foreach.item.group_hash }}\\nPolicy: {{ inputs.policyId }}"
\`\`\`

**Email \`with\` parameters:**
- \`to\` (array of strings, required) — recipient email addresses
- \`subject\` (string, required) — email subject line
- \`message\` (string, required) — email body (plain text)
- \`cc\` (array of strings, optional) — CC recipients
- \`bcc\` (array of strings, optional) — BCC recipients
- \`messageHTML\` (string, optional) — HTML email body

### PagerDuty Notification Workflow

\`\`\`yaml
version: "1"
name: PagerDuty Alert Notifications
description: Triggers and resolves PagerDuty incidents based on alert episode status
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
          rule_id:
            type: string
          group_hash:
            type: string
          episode_id:
            type: string
          episode_status:
            type: string
            enum: [inactive, pending, active, recovering]
        required: [last_event_timestamp, rule_id, group_hash, episode_id, episode_status]
        additionalProperties: false
  required: [id, ruleId, policyId, groupKey, episodes]
  additionalProperties: false

steps:
  - name: for_each_episode
    type: foreach
    foreach: "{{ inputs.episodes | json }}"
    steps:
      - name: trigger_incident
        type: pagerduty
        connector-id: <YOUR_PAGERDUTY_CONNECTOR_ID>
        if: "\${{ foreach.item.episode_status == 'active' }}"
        with:
          eventAction: trigger
          dedupKey: "{{ foreach.item.episode_id }}"
          summary: "Alert fired: rule {{ inputs.ruleId }} — episode {{ foreach.item.episode_id }}"
          severity: critical
          source: "kibana-alerting-v2"
          group: "{{ foreach.item.group_hash }}"

      - name: resolve_incident
        type: pagerduty
        connector-id: <YOUR_PAGERDUTY_CONNECTOR_ID>
        if: "\${{ foreach.item.episode_status == 'inactive' }}"
        with:
          eventAction: resolve
          dedupKey: "{{ foreach.item.episode_id }}"
          summary: "Alert recovered: rule {{ inputs.ruleId }} — episode {{ foreach.item.episode_id }}"
\`\`\`

**PagerDuty \`with\` parameters:**
- \`eventAction\` (string, required) — one of: \`trigger\`, \`acknowledge\`, \`resolve\`
- \`dedupKey\` (string, optional) — deduplication key to group related events
- \`summary\` (string, optional) — human-readable summary
- \`severity\` (string, optional) — one of: \`critical\`, \`error\`, \`warning\`, \`info\`
- \`source\` (string, optional) — source of the event
- \`component\` (string, optional) — component responsible
- \`group\` (string, optional) — logical grouping
- \`timestamp\` (string, optional) — ISO 8601 timestamp

## Discovering Connector Parameters

If the user wants a connector type not shown above, call \`get_step_definitions\` with \`stepType: "<connector_type>"\` to get the full list of \`with\` parameters and their types. Call \`get_connectors\` to find the user's configured connector ID for that type.
`;
