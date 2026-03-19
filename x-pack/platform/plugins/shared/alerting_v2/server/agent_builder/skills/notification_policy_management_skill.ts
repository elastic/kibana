/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const notificationPolicyManagementSkill = defineSkillType({
  id: 'notification-policy-management',
  name: 'notification-policy-management',
  basePath: 'skills/platform/alerting',
  description:
    'Guide for understanding and managing notification policies in Alerting V2 — how alert episodes route to actions like email, Slack, PagerDuty, and webhooks.',
  content: `# Notification Policy Management Guide

## When to Use This Skill

Use this skill when:
- A user wants to understand how notifications work for alerts
- Reviewing which actions fire when an alert becomes active
- Checking throttling, suppression, or snooze settings on policies
- Troubleshooting why a notification was or wasn't sent

## CRITICAL: Notification Policies Only Apply to Alert Rules

Notification policies only match rule events with \`kind: "alert"\` — these events carry \`episode.*\` fields that track lifecycle state. Rules with \`kind: "signal"\` produce point-in-time observations with no episode fields, and their events are invisible to the notification dispatcher. If a user asks why their signal rule isn't sending notifications, explain that signal rules do not participate in the notification system by design.

## Concepts

### Notification Policies
A notification policy connects alert episodes to action connectors. When an \`kind: alert\` rule event has an episode that transitions to a matched state (typically "active"), the Dispatcher evaluates all matching policies and dispatches actions.

### Key Components
- **Matchers**: Rules that determine which alert episodes match this policy (e.g., by label, rule kind, or rule ID)
- **Action Connectors**: The integration target (email, Slack, PagerDuty, webhook, etc.)
- **Throttling**: Minimum interval between repeated notifications for the same episode
- **Suppression**: Time windows or conditions during which notifications are suppressed
- **Snooze**: Manual temporary silencing of a policy

## Investigation Process

### 1. List Policies
- Use \`${internalNamespaces.alertingV2}.list_notification_policies\` to see all configured policies
- Review matchers, connectors, and throttle settings

### 2. Match Rules to Policies
- Use \`${internalNamespaces.alertingV2}.get_rule\` to fetch rule details
- **Confirm the rule is \`kind: alert\`** — only alert rules produce events that match notification policies
- Compare rule labels and kind against policy matchers to determine which policies apply

### 3. Check Rule Events
- Use \`${internalNamespaces.alertingV2}.query_alert_events\` to verify whether episodes reached the "active" state
- If episodes never become active, they won't trigger notification policies

## Troubleshooting
- **No notification sent**: First confirm the rule is \`kind: alert\` (signal rules never trigger notifications). Then check that the episode reached "active" status, that a matching policy exists, and that throttling/suppression isn't blocking it
- **Too many notifications**: Review throttle settings and consider increasing the interval
- **Wrong recipients**: Verify the correct connector is attached to the matching policy
`,
  getRegistryTools: () => [
    `${internalNamespaces.alertingV2}.list_notification_policies`,
    `${internalNamespaces.alertingV2}.get_rule`,
    `${internalNamespaces.alertingV2}.query_alert_events`,
  ],
});
