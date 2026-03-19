/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const alertEpisodesSkill = defineSkillType({
  id: 'alert-episodes',
  name: 'alert-episodes',
  basePath: 'skills/platform/alerting',
  description:
    'Guide for fetching and understanding alert episodes — stateful collections of rule events that track lifecycle from pending through active, recovering, and recovered.',
  content: `# Alert Episodes Guide

## When to Use This Skill

Use this skill when:
- A user wants to see the current state of all alert episodes
- Listing which episodes are currently active, pending, or recovering
- Understanding how long an episode has been open
- Investigating a specific episode's timeline and duration
- Answering questions like "what alerts are currently firing?" or "show me all active episodes"

## CRITICAL: Episodes Only Exist for Alert Rules

Episodes only exist on rules with \`kind: "alert"\`. Signal rules (\`kind: "signal"\`) produce point-in-time observations with no \`episode\` fields — they have no lifecycle tracking and cannot be queried as episodes.

## What Is an Episode?

An episode is a **stateful collection of rule events** for a single alert group. Each time a rule executes, it writes a point-in-time event to the \`.alerting-events\` data stream. For \`kind: alert\` rules, these events carry \`episode.*\` fields that link them into a logical episode with lifecycle state.

Because individual events are point-in-time snapshots, there is no single "episode document" to read. Instead, episodes are **derived** by collapsing the event stream — grouping events by \`episode.id\` and taking the most recent event to determine current state.

## The Episodes ES|QL View

The system registers an ES|QL view \`$.alerting-episodes\` that performs this collapsing:

\`\`\`esql
FROM .alerting-events
| INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp) BY episode.id
| EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
| WHERE @timestamp == last_timestamp AND type == "alert"
| SORT @timestamp DESC
\`\`\`

### How the View Works

1. **\`INLINE STATS ... BY episode.id\`** — For each episode, computes the earliest and latest event timestamp. These are added as new columns to every row without collapsing the rows.
2. **\`EVAL duration\`** — Calculates the episode duration in milliseconds from first to last event.
3. **\`WHERE @timestamp == last_timestamp AND type == "alert"\`** — Keeps only the most recent event per episode, and only for alert-type events (excluding signal events which have no episodes). This is the collapsing step — it reduces N events per episode down to 1 row representing current state.
4. **\`SORT @timestamp DESC\`** — Most recently updated episodes first.

### Key Fields in the Result

| Field | Description |
|-------|-------------|
| \`episode.id\` | Unique identifier for the episode |
| \`episode.status\` | Current lifecycle state: \`pending\`, \`active\`, \`recovering\`, or \`inactive\` |
| \`episode.status_count\` | Consecutive count for the current status (used by pending/recovering thresholds) |
| \`rule.id\` | The rule that produced this episode |
| \`group_hash\` | The alert group (derived from grouping fields) |
| \`status\` | The underlying event status: \`breached\`, \`recovered\`, or \`no_data\` |
| \`data\` | The flattened event payload from the rule's ES|QL query |
| \`first_timestamp\` | When the episode's first event was recorded |
| \`last_timestamp\` | When the episode's most recent event was recorded |
| \`duration\` | Episode duration in milliseconds |

## Querying Episodes

### Fetch All Current Episodes
Query the view directly to get the latest state of every episode:

\`\`\`esql
FROM $.alerting-episodes
\`\`\`

### Filter by Episode Status
\`\`\`esql
FROM $.alerting-episodes
| WHERE episode.status == "active"
\`\`\`

### Filter by Rule
\`\`\`esql
FROM $.alerting-episodes
| WHERE rule.id == "<rule_id>"
\`\`\`

### Filter by Time Range
\`\`\`esql
FROM $.alerting-episodes
| WHERE last_timestamp >= "now-24h"
\`\`\`

### Active Episodes with Duration
\`\`\`esql
FROM $.alerting-episodes
| WHERE episode.status == "active"
| EVAL duration_minutes = duration / 60000
| KEEP episode.id, rule.id, group_hash, episode.status, duration_minutes, first_timestamp, last_timestamp
| SORT duration_minutes DESC
\`\`\`

### Episode Counts by Status
\`\`\`esql
FROM $.alerting-episodes
| STATS count = COUNT(*) BY episode.status
\`\`\`

### Long-Running Episodes
\`\`\`esql
FROM $.alerting-episodes
| WHERE episode.status == "active" AND duration > 3600000
| EVAL duration_hours = duration / 3600000
| SORT duration_hours DESC
| LIMIT 20
\`\`\`

## The Raw Approach (Without the View)

If the ES|QL view is unavailable, the same collapsing can be done against the raw data stream:

\`\`\`esql
FROM .alerting-events
| INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp) BY episode.id
| EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
| WHERE @timestamp == last_timestamp AND type == "alert"
| SORT @timestamp DESC
\`\`\`

Additional filters (by rule, status, time range) can be added as \`WHERE\` clauses before or after the \`INLINE STATS\`.

## Episode Lifecycle Reference

Episodes transition through these states:

\`\`\`
inactive → pending → active → recovering → inactive
                    ↗         ↘
         (re-breach)           (re-breach back to active)
\`\`\`

| Status | Meaning |
|--------|---------|
| **pending** | Breach detected but pending thresholds not yet met |
| **active** | Episode confirmed — pending thresholds met, notification policies can fire |
| **recovering** | Breach condition no longer met, recovering thresholds being evaluated |
| **inactive** | Episode closed — recovery confirmed |

The \`episode.status_count\` field tracks how many consecutive events have been in the current status, which the Director uses to evaluate pending/recovering thresholds.
`,
  referencedContent: [
    {
      name: 'alerting-events-schema',
      relativePath: '.',
      content: `# .alerting-events Document Schema

The \`.alerting-events\` data stream stores all rule execution events.

## Mappings

\`\`\`
@timestamp              date       — When the event was produced
scheduled_timestamp     date       — When the rule execution was scheduled
rule.id                 keyword    — The rule that produced this event
rule.version            long       — The rule version at time of execution
group_hash              keyword    — Unique identifier for the alert group
data                    flattened  — The event payload from the rule's ES|QL query
status                  keyword    — breached | recovered | no_data
source                  keyword    — Origin of the event
type                    keyword    — signal | alert
episode.id              keyword    — Episode identifier (alert type only)
episode.status          keyword    — inactive | pending | active | recovering (alert type only)
episode.status_count    long       — Consecutive count for current status (alert type only)
\`\`\`

## ES|QL Views

Three views are registered against this data stream:

| View Name | Purpose |
|-----------|---------|
| \`$.alerting-events\` | Raw pass-through (\`FROM .alerting-events\`) |
| \`$.alerting-episodes\` | Collapsed episode state with duration |
| \`$.alerting-actions\` | Pass-through for the actions data stream |
`,
    },
  ],
  getRegistryTools: () => [
    `${internalNamespaces.alertingV2}.query_alert_events`,
    `${internalNamespaces.alertingV2}.get_rule`,
    `${internalNamespaces.alertingV2}.list_rules`,
  ],
});
