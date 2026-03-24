/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const notificationPoliciesReference = `# Notification Policies — Background Knowledge

This is reference material only. For action steps on setting up notifications, follow the "Set Up Notifications (Phase 3)" section in the main skill content.

## Two Components

Notifications require two components:

1. **Workflow** — the destination. A YAML definition with an \`alert\` trigger and connector steps (Slack, email, PagerDuty, etc.) that perform the actual notification. Must exist before a policy can route to it.
2. **Notification policy** — the routing. Matches alert episodes by labels/metadata and dispatches them to a workflow.

The chain is: **rule → episode → notification policy matches → workflow executes**.

Signal rules (\`kind: "signal"\`) never trigger notifications.

## What a Notification Policy Contains

- **Matchers** — which episodes to match (by label, rule ID, or rule kind)
- **Workflow destination** — which workflow to dispatch to
- **Throttling** — minimum interval between repeated notifications for the same episode
- **Suppression** — time windows when notifications are silenced
- **Snooze** — manual temporary silencing

## How Matching Works

Policies match based on rule \`metadata.labels\`. A policy with matcher \`environment: production\` only fires for rules whose labels include that value. When setting up notifications for a new rule, the rule's labels must align with the policy's matchers.

## Episode Lifecycle

1. Rule produces events with \`kind: "alert"\`
2. Director tracks: inactive → pending → **active** → recovering → inactive
3. On **active**, Dispatcher evaluates policies → dispatches to workflow
4. Throttling prevents repeats within the configured interval

## Troubleshooting

**Not getting notified?** Check in order:
1. Rule is \`kind: "alert"\`? (signal rules are excluded)
2. Episode reached "active"? (pending = threshold not met yet)
3. Matching notification policy exists?
4. Policy not snoozed or suppressed?
5. Not within throttle interval?
6. Workflow destination exists and is valid?
`;
