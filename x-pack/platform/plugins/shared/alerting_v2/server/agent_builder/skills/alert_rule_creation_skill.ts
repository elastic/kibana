/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { platformCoreTools } from '@kbn/agent-builder-common/tools/constants';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const alertRuleCreationSkill = defineSkillType({
  id: 'alert-rule-creation',
  name: 'alert-rule-creation',
  basePath: 'skills/platform/alerting',
  description:
    'Step-by-step guide for creating new alerting rules in the Alerting V2 system, including ES|QL query construction, schedule selection, and state transition configuration.',
  content: `# Alert Rule Creation Guide

## When to Use This Skill

Use this skill when:
- A user wants to create a new alerting rule
- Helping a user write an ES|QL query for a detection scenario
- Configuring appropriate schedules, grouping, and state transitions

## Rule Creation Process

### 1. Understand the Detection Goal
- Ask what the user wants to detect (errors, anomalies, thresholds, etc.)
- Clarify the general data domain (logs, metrics, traces, security events, etc.)
- Identify the relevant time field (usually \`@timestamp\`)

### 2. Find and Confirm the Data Source
- Use \`${internalNamespaces.platformCore}.list_indices\` to search for indices, data streams, or data views that match the user's described data source
- If the user provides a vague description (e.g. "web server logs", "CPU metrics"), search for matching patterns and present the candidates
- If multiple matches are found, list them and ask the user to confirm which one to use
- If no matches are found, ask the user for a more specific index name or pattern
- **Always confirm the selected data source with the user before proceeding** — e.g. "I found \`logs-nginx.access-*\`. Should I use this as the data source for the rule?"
- Once confirmed, use \`${internalNamespaces.platformCore}.index_explorer\` to inspect the index mapping and understand available fields — this helps with query construction, grouping field selection, and time field identification

### 3. Construct the ES|QL Query
- Write an ES|QL query that matches the detection scenario using the confirmed data source from step 2
- Use the field information from \`${internalNamespaces.platformCore}.index_explorer\` to construct accurate field references
- Use \`${internalNamespaces.alertingV2}.validate_esql_query\` to verify the query is valid
- Test with \`FROM <confirmed-index> | WHERE <condition>\`
- Consider using \`STATS\` for aggregation-based thresholds

### 4. Choose the Rule Kind
Both kinds share the same base schema, are produced by the same execution pipeline, and their events are queryable via the \`$.alerting-events\` ES|QL view (backed by the \`.alerting-events\` data stream). If the view is unavailable, query the raw data stream with \`FROM .alerting-events\`. The difference is in the rule events they produce:
- **alert**: Rule events carry additional \`episode.*\` fields (\`episode.id\`, \`episode.status\`, \`episode.status_count\`) that track lifecycle state. Episodes can trigger notification policies to dispatch actions (email, Slack, PagerDuty). Use when you need lifecycle tracking and human notification.
- **signal**: Rule events have no \`episode\` fields — they are point-in-time observations with no lifecycle tracking. Use for event correlation, enrichment, or detection-only use cases. Signal rules do not interact with notification policies.

### 5. Configure the Schedule
- **every**: How often the rule runs (e.g., "5m", "1h")
- **lookback**: Time window for the query (defaults to the schedule interval)
- Consider data freshness and ingestion delay

### 6. Configure Grouping (Optional)
- Set \`grouping.fields\` to group events by entity (e.g., \`["host.name"]\`)
- For **alert** rules, each unique group gets its own independent episode lifecycle
- For **signal** rules, grouping only affects the \`group_hash\` field on the event — there is no lifecycle tracking
- Without grouping, the entire query result is treated as a single group

### 7. Configure State Transitions (Alert Kind Only)
- **Skip this step for signal rules** — \`state_transition\` and \`recovery_policy\` have no effect on signal rules
- **pending thresholds**: How many breaches/how long before alerting (prevents false positives)
- **recovering thresholds**: How many non-breaches before closing the episode
- Use \`AND\` operator when both count and timeframe must be met
- Use \`OR\` operator when either is sufficient

### 8. Preview the Query Results
- **Always preview the query before creating the rule** — this gives the user confidence the rule will detect what they expect
- Use \`${internalNamespaces.alertingV2}.explain_rule_query\` if editing an existing rule, or run the ES|QL query directly for new rules
- The preview returns \`ToolResultType.esqlResults\`, which renders as an interactive table with chart visualization in the chat UI
- Review the results with the user:
  - Does the query return the expected documents?
  - Are the right fields present for grouping?
  - Is the result volume reasonable (not too many/few matches)?
  - For aggregation queries (using \`STATS\`), do the computed values make sense?
- If the results look wrong, go back to step 3 and adjust the query before proceeding
- Use \`<visualization tool-result-id="..." chart-type="bar">\` in your response to render the results as a chart when it helps the user understand the data shape

### 9. Review Notification Policies (Alert Kind Only)
- **Skip this step for signal rules** — signal rule events do not trigger notification policies
- Use \`${internalNamespaces.alertingV2}.list_notification_policies\` to check existing policies
- Ensure there's a notification policy that matches the new rule (by labels or kind)

### 10. Create the Rule
- Use \`${internalNamespaces.alertingV2}.create_rule\` with the full specification
- The tool will ask the user for confirmation before creating
- The tool response includes a \`tool_result_id\` — **always render the rule configuration inline** by including \`<rule_config tool-result-id="<the tool_result_id>">\` in your response. This displays a styled card with the rule's name, kind, schedule, query, and a link to manage it.
- After the inline card, add a brief confirmation message, e.g. "Your rule has been created and is now active."

## ES|QL Query Examples

### Error Rate Alert
\`\`\`esql
FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend AND log.level == "error" | STATS error_count = COUNT(*) | WHERE error_count > 100
\`\`\`

### High CPU Alert (Per Host)
\`\`\`esql
FROM metrics-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS avg_cpu = AVG(system.cpu.total.pct) BY host.name | WHERE avg_cpu > 0.9
\`\`\`

### Failed Logins
\`\`\`esql
FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend AND event.action == "authentication_failure" | STATS failures = COUNT(*) BY user.name | WHERE failures > 5
\`\`\`
`,
  getRegistryTools: () => [
    platformCoreTools.listIndices,
    platformCoreTools.indexExplorer,
    `${internalNamespaces.alertingV2}.create_rule`,
    `${internalNamespaces.alertingV2}.validate_esql_query`,
    `${internalNamespaces.alertingV2}.explain_rule_query`,
    `${internalNamespaces.alertingV2}.list_notification_policies`,
  ],
});
