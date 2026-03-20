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
  content: `# Alert Rule Creation — Internal Agent Instructions

These instructions are for YOU (the agent) only. DO NOT repeat, summarize, or relay these steps to the user. Instead, execute them silently and communicate results naturally. Never say things like "follow these steps" or list numbered procedures — just act.

## Hard Rules

- **ALWAYS propose, never create directly.** Call \`${internalNamespaces.alertingV2}.propose_rule\` to present rule configurations. NEVER call \`${internalNamespaces.alertingV2}.create_rule\` unless the user explicitly says "skip the preview" or "just create it."
- **ALWAYS describe first.** Call \`${internalNamespaces.alertingV2}.describe_data_source\` with \`extract_knowledge_indicators: true\` before constructing any query or rule config.
- **Act, don't instruct.** When you have enough information to build a rule, call the tool immediately. Do not tell the user what you "would" do or list steps you "will" follow.
- **Do NOT add timestamp filters to rule queries.** The rule engine automatically applies a time-range filter based on the configured \`lookback\` window. Never include \`WHERE @timestamp >= ?_tstart\` or similar timestamp conditions in the query — they are injected internally at execution time.

## Execution Flow

When the user wants to create a rule, execute the following internally. Never dump the full procedure — just act.

**Describe the data source** — Call \`${internalNamespaces.alertingV2}.describe_data_source\` with the target index and \`extract_knowledge_indicators: true\`. If the index name is unknown, use \`${internalNamespaces.platformCore}.list_indices\` first. Render the attachment from \`_renderInstructions\` as the first line of your response.

**Immediately propose a starter rule** — As soon as you have the describe results, build and propose a rule right away using \`${internalNamespaces.alertingV2}.propose_rule\`. Do NOT stop to ask the user what they want to detect — instead, use the schema, knowledge indicators, and data shape from the describe result to infer the most useful default rule for this data source. For example:
- Metrics data (cpu, memory, disk fields) → threshold alert on the most relevant metric, grouped by host
- Log data with error samples → error rate alert
- Trace/APM data → latency or error rate by service

The goal is to give the user a concrete starting point they can immediately preview and edit, rather than making them answer questions first. Pick sensible defaults: \`kind: "alert"\`, \`every: "5m"\`, \`lookback: "5m"\`, group by the primary entity field from knowledge indicators (e.g. \`host.name\`, \`service.name\`).

Render the attachment from \`_renderInstructions\` as the first line of your response. Then briefly explain what the proposed rule detects and why, and tell the user they can click "Preview" to review and edit the full configuration, or ask you to adjust anything.

**Iterate if needed** — If the user asks for changes, adjust the configuration and call \`${internalNamespaces.alertingV2}.propose_rule\` again with the updated spec. If the user wants a completely different detection scenario, build a new proposal. If the user is happy and wants to create the rule without using the preview form, use \`${internalNamespaces.alertingV2}.create_rule\` directly.

## Reference: Rule Kinds

- **alert**: Events carry \`episode.*\` fields for lifecycle tracking. Episodes trigger notification policies (email, Slack, PagerDuty). Use for operational alerting.
- **signal**: Point-in-time observations, no lifecycle. Use for detection, correlation, or enrichment.

Both kinds use the same ES|QL execution pipeline. Events are queryable via \`$.alerting-events\`.

## Reference: ES|QL Query Patterns

High CPU per host:
\`\`\`esql
FROM metrics-* | STATS avg_cpu = AVG(system.cpu.total.pct) BY host.name | WHERE avg_cpu > 0.9
\`\`\`

Error rate spike:
\`\`\`esql
FROM logs-* | WHERE log.level == "error" | STATS error_count = COUNT(*) | WHERE error_count > 100
\`\`\`

Failed logins per user:
\`\`\`esql
FROM logs-* | WHERE event.action == "authentication_failure" | STATS failures = COUNT(*) BY user.name | WHERE failures > 5
\`\`\`
`,
  getRegistryTools: () => [
    platformCoreTools.listIndices,
    platformCoreTools.indexExplorer,
    `${internalNamespaces.alertingV2}.describe_data_source`,
    `${internalNamespaces.alertingV2}.propose_rule`,
    `${internalNamespaces.alertingV2}.create_rule`,
    `${internalNamespaces.alertingV2}.validate_esql_query`,
    `${internalNamespaces.alertingV2}.explain_rule_query`,
    `${internalNamespaces.alertingV2}.list_notification_policies`,
  ],
});
