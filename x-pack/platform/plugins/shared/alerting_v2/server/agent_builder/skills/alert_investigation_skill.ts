/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const alertInvestigationSkill = defineSkillType({
  id: 'alert-investigation',
  name: 'alert-investigation',
  basePath: 'skills/platform/alerting',
  description:
    'Guide for investigating alerting rule firings, understanding episode lifecycle, and diagnosing alert behaviour in the Alerting V2 system.',
  content: `# Alert Investigation Guide

## When to Use This Skill

Use this skill when:
- Investigating why a rule fired or did not fire
- Understanding the lifecycle of an alert episode (pending → active → recovering → inactive)
- Diagnosing unexpected behaviour (flapping, missed detections, etc.)
- Reviewing the timeline of rule events for a specific rule or group

## CRITICAL: Check the Rule Kind First

Rules have a \`kind\` field (\`signal\` or \`alert\`). Both produce rule events in the \`$.alerting-events\` ES|QL view (backed by the \`.alerting-events\` data stream) via the same pipeline, but the investigation approach differs:

- **\`kind: alert\`** — Events carry \`episode.*\` fields (\`episode.id\`, \`episode.status\`, \`episode.status_count\`). Investigate episode lifecycle, state transitions, and notification policy matching.
- **\`kind: signal\`** — Events have no \`episode\` fields. They are point-in-time observations. Investigate by reviewing \`status\` (breached/recovered/no_data) values directly. There are no episodes, no state transitions, and no notification policy matching.

## Investigation Process

### 1. Identify the Rule
- Use \`${internalNamespaces.alertingV2}.get_rule\` to fetch the rule definition
- **Check the \`kind\` field first** — this determines which investigation steps apply
- Review the ES|QL query, schedule, and grouping configuration

### 2. Query Rule Events
- Use \`${internalNamespaces.alertingV2}.query_alert_events\` to retrieve recent rule events
- Filter by rule ID and/or status to narrow results
- For **alert** rules: review \`episode.id\`, \`episode.status\`, and status transitions across events
- For **signal** rules: review \`status\` values (breached/recovered/no_data) and timestamps — there are no episode fields

### 3. Explain the Rule Query
- Use \`${internalNamespaces.alertingV2}.explain_rule_query\` to run a sample of the rule's ES|QL query
- This helps determine whether the underlying data matches the rule conditions
- Check if the query returns expected results

### 4. Analyse Episode Lifecycle (Alert Kind Only)
- This step only applies to \`kind: alert\` rules. Skip for signal rules.
- Review the episode states in the rule events (see referenced content for episode-lifecycle details)
- Check if pending thresholds (count/timeframe) are properly configured
- Verify recovery policy settings

### 5. Synthesise Findings
- Summarise the rule configuration, recent events, and any anomalies
- For signal rules: focus on whether the query is producing the expected breached/no_data events
- For alert rules: additionally assess episode lifecycle behaviour and notification policy matching
- Provide recommendations for adjustments if needed
`,
  referencedContent: [
    {
      name: 'episode-lifecycle',
      relativePath: '.',
      content: `# Alert Episode Lifecycle (kind: alert only)

Episode lifecycle tracking only applies to rules with \`kind: "alert"\`. Rules with \`kind: "signal"\` produce events with no \`episode\` fields — they are point-in-time observations.

## Episode States

For \`kind: alert\` rules, events carry \`episode.*\` fields and transition through these states managed by the Director service:

| Status      | Description |
|-------------|-------------|
| **inactive**  | No breach detected. Default starting state. |
| **pending**   | Breach detected but hasn't yet met the threshold for activation (count, timeframe, or both via AND/OR operator). |
| **active**    | The episode is confirmed active — the pending thresholds have been met. Notification policies can now fire. |
| **recovering** | The breach condition is no longer met, but the episode has not yet recovered (recovering thresholds may apply). |

## State Transitions

\`\`\`
inactive → pending → active → recovering → inactive
                    ↗         ↘
         (re-breach)           (re-breach back to active)
\`\`\`

### Key Configuration (alert kind only)
- **pending_count / pending_timeframe / pending_operator**: Controls how many consecutive breaches and/or how long before moving from pending to active.
- **recovering_count / recovering_timeframe / recovering_operator**: Controls how many consecutive non-breaches before moving from active to inactive.
- **Recovery Policy**: Determines how recovery is detected ("no_breach" or a separate "query").

## Grouping
When \`grouping.fields\` is configured:
- For **alert** rules, the Director tracks separate episodes per unique group key (e.g., per host.name). Each group has its own independent state machine.
- For **signal** rules, grouping only affects the \`group_hash\` field on the event document — there is no state machine.
`,
    },
  ],
  getRegistryTools: () => [
    `${internalNamespaces.alertingV2}.get_rule`,
    `${internalNamespaces.alertingV2}.query_alert_events`,
    `${internalNamespaces.alertingV2}.explain_rule_query`,
  ],
});
