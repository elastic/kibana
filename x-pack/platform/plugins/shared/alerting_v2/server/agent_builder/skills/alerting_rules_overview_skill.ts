/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const alertingRulesOverviewSkill = defineSkillType({
  id: 'alerting-rules-overview',
  name: 'alerting-rules-overview',
  basePath: 'skills/platform/alerting',
  description:
    'Overview guide for understanding the Alerting V2 rule types, available fields, and how to browse and search rules.',
  content: `# Alerting Rules Overview

## When to Use This Skill

Use this skill when:
- A user wants a high-level overview of their alerting rules
- Explaining the difference between rule kinds
- Helping users search and filter their rules

## Rule Kinds

Rules have a \`kind\` field with one of two values: \`signal\` or \`alert\`.
Both kinds share the same base schema, are produced by the same execution pipeline, and their events are queryable via the \`$.alerting-events\` ES|QL view (backed by the \`.alerting-events\` data stream). If the view is unavailable, query the raw data stream with \`FROM .alerting-events\`.
The only difference is in the rule events they produce.

### Alert Rules (\`kind: "alert"\`)
- Rule events carry additional \`episode.*\` fields (\`episode.id\`, \`episode.status\`, \`episode.status_count\`) that track lifecycle state
- Episodes progress through states: pending → active → recovering → inactive
- Episodes can trigger notification policies to dispatch actions (email, Slack, etc.)
- Support state transition configuration (pending/recovering thresholds)
- Best for operational alerting that requires human notification

### Signal Rules (\`kind: "signal"\`)
- Rule events have no \`episode\` fields — they are point-in-time observations with no lifecycle tracking
- Useful for correlation, enrichment, or detection-only use cases
- Do not trigger notification policies (notification policies only match events with episode data)
- \`state_transition\` and \`recovery_policy\` settings have no effect on signal rules

### Rule Event Schema Comparison

| Field | Signal Events | Alert Events |
|-------|--------------|--------------|
| \`kind\` | \`"signal"\` | \`"alert"\` |
| \`@timestamp\` | ✅ | ✅ |
| \`rule.id\` | ✅ | ✅ |
| \`group_hash\` | ✅ | ✅ |
| \`data\` | ✅ | ✅ |
| \`status\` (breached/recovered/no_data) | ✅ | ✅ |
| \`episode.id\` | ❌ | ✅ |
| \`episode.status\` | ❌ | ✅ |
| \`episode.status_count\` | ❌ | ✅ |

## Rule Configuration Fields

| Field | Description | Applies To |
|-------|-------------|------------|
| **metadata.name** | Human-readable rule name | both |
| **metadata.description** | Longer description | both |
| **metadata.owner** | Owning team or user | both |
| **metadata.labels** | Tags for categorisation and policy matching | both |
| **time_field** | Timestamp field for queries (e.g., \`@timestamp\`) | both |
| **schedule.every** | Execution interval (ISO 8601 duration) | both |
| **schedule.lookback** | Query time window (defaults to schedule interval) | both |
| **evaluation.query.base** | The ES|QL query | both |
| **evaluation.query.condition** | Additional condition appended to the query | both |
| **grouping.fields** | Fields to group events by | both |
| **state_transition** | Pending/recovering thresholds | alert only |
| **recovery_policy** | How recovery is detected | alert only |
| **enabled** | Whether the rule is currently running | both |

## Browsing Rules

- Use \`${internalNamespaces.alertingV2}.list_rules\` to paginate through all rules
- Use the \`filter\` parameter with KQL syntax to search specific rules
  - Example: \`enabled: true AND kind: alert\`
  - Example: \`metadata.labels: "production"\`
- Use \`${internalNamespaces.alertingV2}.get_rule\` for full details of a specific rule
`,
  getRegistryTools: () => [
    `${internalNamespaces.alertingV2}.list_rules`,
    `${internalNamespaces.alertingV2}.get_rule`,
  ],
});
