/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const workflowTriggerInvestigationSkill = defineSkillType({
  id: 'workflow-trigger-investigation',
  name: 'workflow-trigger-investigation',
  basePath: 'skills/platform/alerting',
  description:
    'Guide for determining whether an alert episode actually triggered a workflow via the notification pipeline. ' +
    'Covers querying the $.alerting-actions view for fire, suppress, notified, and unmatched action records.',
  content: `# Workflow Trigger Investigation Guide

## When to Use This Skill

Use this skill when:
- A user wants to know if an alert actually triggered a workflow
- Investigating why a workflow was or was not dispatched for a given alert
- Checking if a notification was suppressed, throttled, or unmatched
- Auditing the action history for a specific rule or episode

## CRITICAL: Only kind: alert Rules Trigger Workflows

Only rules with \`kind: "alert"\` produce events that carry \`episode.*\` fields and can be dispatched to workflows via notification policies.
Rules with \`kind: "signal"\` produce point-in-time observations with no episode tracking — they never enter the notification pipeline and will never appear in the \`$.alerting-actions\` ES|QL view (backed by the \`.alerting-actions\` data stream).
If a user asks why their signal rule didn't trigger a workflow, the answer is: signal rules do not participate in the notification system by design.

## Data Model

### $.alerting-actions View

All dispatcher decisions and user actions are recorded as documents in the \`$.alerting-actions\` ES|QL view (backed by the \`.alerting-actions\` data stream). If the view is unavailable, query the raw data stream with \`FROM $.alerting-actions\`.

#### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| \`@timestamp\` | date | When the action was recorded |
| \`rule_id\` | keyword | The rule that produced the episode |
| \`group_hash\` | keyword | Unique identifier for the alert group |
| \`episode_id\` | keyword | The episode that was evaluated |
| \`action_type\` | keyword | The type of action recorded (see below) |
| \`actor\` | keyword | Who performed the action (\`"system"\` for dispatcher, user profile UID for manual actions) |
| \`notification_group_id\` | keyword | The notification group ID (present on \`notified\` records) |
| \`reason\` | text | Human-readable explanation of why the action was taken |
| \`source\` | keyword | Origin of the action (\`"internal"\` for system) |
| \`last_series_event_timestamp\` | date | Timestamp of the alert event that triggered this action |

#### action_type Values

**System (dispatcher) action types:**

| action_type | Granularity | Meaning |
|-------------|-------------|---------|
| \`fire\` | **Per episode** | One record per episode dispatched to a workflow. **This is the confirmation that a workflow was triggered.** The \`episode_id\` and \`group_hash\` identify exactly which episode was fired. |
| \`notified\` | **Per notification group** | One record per notification group, regardless of how many episodes it contains. Carries \`notification_group_id\` and is used by the dispatcher for **throttle tracking** — the throttling step queries these records to find the last time each group was notified. The \`group_hash\` on \`notified\` records is always the literal string \`"irrelevant"\` because the record represents the group as a whole, not a single episode. |
| \`suppress\` | **Per episode** | The episode was suppressed and NOT dispatched. The \`reason\` field explains why (acknowledged, deactivated, snoozed, or throttled). |
| \`unmatched\` | **Per episode** | The episode was dispatchable but no notification policy matched it. No workflow was triggered. |

> **fire vs notified**: If a notification group contains 3 episodes, the dispatcher writes 3 \`fire\` records (one per episode) and 1 \`notified\` record (for the group). To check whether a *specific episode* triggered a workflow, query for \`fire\` by \`episode_id\`. To check throttling history for a notification group, query for \`notified\` by \`notification_group_id\`.

**User action types** (recorded via the alert actions API):

| action_type | Meaning |
|-------------|---------|
| \`ack\` | User acknowledged the episode (suppresses future notifications until unack) |
| \`unack\` | User removed acknowledgement |
| \`snooze\` | User snoozed the alert group (suppresses until expiry) |
| \`unsnooze\` | User removed snooze |
| \`activate\` | User manually activated an alert |
| \`deactivate\` | User manually deactivated an alert (suppresses until reactivated) |

## Investigation Process

### 1. Identify the Rule and Confirm It Is kind: alert
- Use \`${internalNamespaces.alertingV2}.get_rule\` to fetch the rule
- Confirm \`kind\` is \`"alert"\` — if it is \`"signal"\`, workflows will never be triggered

### 2. Check That the Episode Reached Active Status
- Use \`${internalNamespaces.alertingV2}.query_alert_events\` to find recent events for the rule
- Look for events with \`episode.status == "active"\` — only active episodes are dispatchable
- If the episode is stuck in \`pending\`, the state transition thresholds haven't been met yet

### 3. Query the .alerting-actions Data Stream
Use the \`${internalNamespaces.alertingV2}.query_alert_events\` tool or a direct ES|QL query against \`$.alerting-actions\` to check what the dispatcher decided:

#### Did a specific rule trigger any workflows?
\`\`\`esql
FROM $.alerting-actions
| WHERE rule_id == "<rule_id>" AND action_type == "fire"
| SORT @timestamp DESC
| LIMIT 20
\`\`\`

#### Was an episode suppressed instead of fired?
\`\`\`esql
FROM $.alerting-actions
| WHERE rule_id == "<rule_id>" AND action_type IN ("fire", "suppress", "unmatched")
| SORT @timestamp DESC
| LIMIT 50
\`\`\`
Review the \`reason\` field on \`suppress\` records to understand why.

#### Were any notification groups notified?
\`\`\`esql
FROM $.alerting-actions
| WHERE rule_id == "<rule_id>" AND action_type == "notified"
| SORT @timestamp DESC
| LIMIT 20
\`\`\`
The \`notification_group_id\` on these records links back to the notification policy.

#### Check user actions (ack/snooze/deactivate) that may suppress notifications
\`\`\`esql
FROM $.alerting-actions
| WHERE rule_id == "<rule_id>" AND action_type IN ("ack", "snooze", "deactivate")
| SORT @timestamp DESC
| LIMIT 20
\`\`\`

### 4. Check Notification Policies
- Use \`${internalNamespaces.alertingV2}.list_notification_policies\` to review configured policies
- Verify that a policy's matcher matches the rule's labels and metadata
- Check that the policy has a \`workflow\` destination configured
- Check that the policy is enabled and not snoozed

### 5. Synthesise Findings

Summarise using this decision tree:

1. **Is the rule \`kind: alert\`?** No → workflows can never be triggered
2. **Did the episode reach \`active\` status?** No → check pending thresholds
3. **Is there a \`fire\` action in \`$.alerting-actions\`?** Yes → ✅ workflow was triggered
4. **Is there a \`suppress\` action?** Yes → check \`reason\` (ack, snooze, deactivate, or throttle)
5. **Is there an \`unmatched\` action?** Yes → no notification policy matched — check policy matchers
6. **No records at all?** → the dispatcher hasn't run yet, or the episode wasn't dispatchable
`,
  referencedContent: [
    {
      name: 'alerting-actions-schema',
      relativePath: '.',
      content: `# .alerting-actions Document Schema

The \`.alerting-actions\` data stream stores all dispatcher decisions and user actions.

## Mappings

\`\`\`
@timestamp            date       — When the action was recorded
last_series_event_timestamp  date  — Timestamp of the triggering alert event
expiry                date       — Expiry for snooze actions
actor                 keyword    — "system" or user profile UID
action_type           keyword    — fire | notified | suppress | unmatched | ack | unack | snooze | unsnooze | activate | deactivate
group_hash            keyword    — Alert group identifier
episode_id            keyword    — Episode identifier
rule_id               keyword    — Rule that produced the episode
notification_group_id keyword    — Notification group (present on "notified" records)
source                keyword    — "internal" for system actions
reason                text       — Human-readable explanation
\`\`\`

## Key Relationships

- \`fire\` is written **per episode** — one record per episode dispatched to a workflow. Use \`episode_id\` to trace a specific episode.
- \`notified\` is written **per notification group** — one record regardless of how many episodes were in the group. Its \`notification_group_id\` links to the policy and the dispatcher queries these records for throttle timing. The \`group_hash\` on \`notified\` records is the literal string \`"irrelevant"\`.
- If a notification group has N episodes, you'll see N \`fire\` records + 1 \`notified\` record.
- \`suppress\` records include a \`reason\` explaining the suppression cause (ack, snooze, deactivate, or throttle).
- \`unmatched\` records indicate no notification policy matched the episode.
- User actions (\`ack\`, \`snooze\`, \`deactivate\`) create suppression state that the dispatcher checks on subsequent runs.
`,
    },
  ],
  getRegistryTools: () => [
    `${internalNamespaces.alertingV2}.get_rule`,
    `${internalNamespaces.alertingV2}.query_alert_events`,
    `${internalNamespaces.alertingV2}.list_notification_policies`,
  ],
});
