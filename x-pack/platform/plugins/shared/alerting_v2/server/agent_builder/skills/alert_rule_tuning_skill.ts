/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const alertRuleTuningSkill = defineSkillType({
  id: 'alert-rule-tuning',
  name: 'alert-rule-tuning',
  basePath: 'skills/platform/alerting',
  description:
    'Guide for diagnosing and tuning noisy, flapping, or under-performing alerting rules — adjusting thresholds, queries, schedules, and state transitions.',
  content: `# Alert Rule Tuning Guide

## When to Use This Skill

Use this skill when:
- A rule is too noisy (firing too often)
- A rule is flapping (rapidly alternating between active and recovering)
- A rule is not detecting the expected conditions
- A user wants to optimise alert quality

## CRITICAL: Check the Rule Kind First

Rules have a \`kind\` field (\`signal\` or \`alert\`). Both kinds share the same base schema and execution pipeline, but tuning strategies differ:

- **\`kind: alert\`** — Events carry \`episode.*\` fields with lifecycle tracking. You can tune state transition thresholds (\`pending_count\`, \`recovering_count\`, etc.) and recovery policies.
- **\`kind: signal\`** — Events are point-in-time observations with no \`episode\` fields and no lifecycle tracking. \`state_transition\` and \`recovery_policy\` settings have no effect. Tuning is limited to the ES|QL query, schedule, lookback, and grouping.

## Diagnosis Process

### 1. Review the Current Rule
- Use \`${internalNamespaces.alertingV2}.get_rule\` to inspect the rule definition
- **Check the \`kind\` field first** — this determines which tuning strategies are available
- Check the ES|QL query, schedule, and grouping configuration

### 2. Analyse Recent Rule Events
- Use \`${internalNamespaces.alertingV2}.query_alert_events\` to see the recent event timeline
- For **alert** rules: look for rapid \`episode.status\` changes (flapping), too many episodes, or episodes stuck in pending
- For **signal** rules: look for too many \`status: breached\` events or unexpected \`status: no_data\` events — there are no episodes to inspect

### 3. Sample the Query
- Use \`${internalNamespaces.alertingV2}.explain_rule_query\` to run the query with a small LIMIT
- Check whether the data volume and shape match expectations

## Common Tuning Strategies

### Noisy Rules (Too Many Events)
1. **Raise thresholds**: Increase the condition threshold in the ES|QL query (applies to both kinds)
2. **Add pending thresholds** (alert kind only): Set \`pending_count\` or \`pending_timeframe\` to require sustained breaches before an episode becomes active
3. **Refine the query**: Add WHERE clauses to exclude known benign patterns (applies to both kinds)
4. **Adjust grouping**: Add grouping fields to separate noise from real issues (applies to both kinds)

### Flapping Rules (Alert Kind Only)
Signal rules cannot flap — they have no episode lifecycle. These strategies only apply to \`kind: alert\`:
1. **Increase recovering thresholds**: Set \`recovering_count\` and/or \`recovering_timeframe\` to prevent premature recovery
2. **Widen the lookback**: Increase \`schedule.lookback\` to smooth out intermittent conditions
3. **Use AND operator**: Require both count and timeframe for state transitions

### Missing Detections
1. **Check data freshness**: Ensure the lookback window accounts for ingestion delay (applies to both kinds)
2. **Broaden the query**: Remove overly specific filters (applies to both kinds)
3. **Validate the query**: Use \`${internalNamespaces.alertingV2}.validate_esql_query\` to confirm the query is valid (applies to both kinds)
4. **Check enabled state**: Ensure the rule is enabled (applies to both kinds)

### 4. Apply Changes
- Use \`${internalNamespaces.alertingV2}.update_rule\` to apply tuning adjustments
- Explain each change to the user
- Recommend monitoring the rule for a period after changes
`,
  getRegistryTools: () => [
    `${internalNamespaces.alertingV2}.get_rule`,
    `${internalNamespaces.alertingV2}.query_alert_events`,
    `${internalNamespaces.alertingV2}.explain_rule_query`,
    `${internalNamespaces.alertingV2}.update_rule`,
    `${internalNamespaces.alertingV2}.validate_esql_query`,
  ],
});
