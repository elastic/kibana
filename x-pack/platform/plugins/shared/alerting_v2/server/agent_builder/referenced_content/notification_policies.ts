/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const notificationPoliciesReference = `# Notification Policies Reference

## How Notifications Work

Notification policies connect alert episodes to action connectors. When a rule with \`kind: "alert"\` produces an episode that transitions to the "active" state, the Dispatcher evaluates all notification policies and dispatches actions for any that match.

Rules with \`kind: "signal"\` never trigger notifications — they produce point-in-time observations with no episode fields, making them invisible to the notification dispatcher.

## Key Concepts

### Notification Policy
A policy defines: which episodes to match, what action to take, and how to throttle repeat notifications. Each policy has:
- **Matchers** — rules that determine which episodes this policy applies to (by label, rule kind, rule ID, or other metadata)
- **Action Connector** — the integration target (email, Slack, PagerDuty, webhook, Microsoft Teams, etc.)
- **Throttling** — minimum interval between repeated notifications for the same episode (prevents notification storms)
- **Suppression** — time windows or conditions during which notifications are silenced
- **Snooze** — manual temporary silencing of a policy

### Episode → Notification Flow

1. Rule executes and produces events with \`kind: "alert"\`
2. The Director tracks episode lifecycle: inactive → pending → **active** → recovering → inactive
3. When an episode transitions to **active**, the Dispatcher evaluates notification policies
4. Policies whose matchers match the episode's labels/metadata fire their action connectors
5. Throttling prevents the same episode from triggering the same policy again within the configured interval

### What Triggers a Notification
- Episode reaching **active** status (the pending threshold has been met)
- Only \`kind: "alert"\` rules — never \`kind: "signal"\`

### What Does NOT Trigger a Notification
- Episodes stuck in **pending** (haven't met the pending threshold yet)
- Episodes in **recovering** or **inactive** state
- Signal rule events (no episode fields, invisible to dispatcher)
- Episodes matching a policy that is snoozed or in a suppression window
- Repeat notifications within the throttle interval

## Matching

Policies match episodes based on:
- **Labels** — rule \`metadata.labels\` are compared against policy matchers (e.g. a policy matching \`environment: production\` only fires for rules with that label)
- **Rule ID** — a policy can target a specific rule by ID
- **Rule kind** — always \`"alert"\` (signal rules are excluded by design)

When proposing a rule, choosing meaningful labels helps the user connect it to notification policies later.

## Notification Policies and Workflows

Notification policies and workflows are two sides of the same dispatch pipeline:

- A **notification policy** defines the matching rules and the destination. When an episode matches a policy, the Dispatcher writes a \`fire\` record per episode and a \`notified\` record per notification group to the \`.alerting-actions\` data stream.
- A **workflow** is what gets triggered as the destination of a notification policy. Workflows can be simple (send an email, post to Slack) or complex (multi-step automation via webhook, PagerDuty incident creation, etc.).

The relationship is: **notification policy → matches episodes → triggers workflow**.

### Action Records

Every Dispatcher decision is recorded in the \`$.alerting-actions\` ES|QL view (backed by the \`.alerting-actions\` data stream):

| action_type | Meaning |
|-------------|---------|
| \`fire\` | Episode was dispatched to a workflow (one record per episode) |
| \`notified\` | Notification group was notified (one record per group, used for throttle tracking) |
| \`suppress\` | Episode was suppressed — check the \`reason\` field (acknowledged, snoozed, deactivated, or throttled) |
| \`unmatched\` | Episode was dispatchable but no notification policy matched it |

User actions (\`ack\`, \`unack\`, \`snooze\`, \`unsnooze\`, \`activate\`, \`deactivate\`) are also recorded here and create suppression state that affects future Dispatcher decisions.

### Investigating Whether a Workflow Was Triggered

To confirm a specific episode triggered a workflow, query for \`fire\` records by \`episode_id\` in \`$.alerting-actions\`. If you find \`suppress\` or \`unmatched\` records instead, the \`reason\` field explains why the workflow was not triggered.

## Common Questions

**"Why didn't I get notified?"**
1. Is the rule \`kind: "alert"\`? Signal rules never trigger notifications.
2. Did the episode reach "active" status? Check with \`query_alert_events\`.
3. Does a matching notification policy exist? Check with \`list_notification_policies\`.
4. Is the policy snoozed or in a suppression window?
5. Is throttling preventing a repeat notification?

**"How do I set up notifications for my rule?"**
Notification policies are configured in the Notification Policies management page. The agent can check existing policies with \`list_notification_policies\` but cannot create new policies programmatically. Guide the user to the management UI.
`;
