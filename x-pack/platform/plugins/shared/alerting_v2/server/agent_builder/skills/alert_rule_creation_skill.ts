/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { platformCoreTools } from '@kbn/agent-builder-common/tools/constants';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { alertWorkflowExample } from '../referenced_content/alert_workflow_example';
import { notificationPoliciesReference } from '../referenced_content/notification_policies';

export const alertRuleCreationSkill = defineSkillType({
  id: 'alert-rule-creation',
  name: 'alert-rule-creation',
  basePath: 'skills/platform/alerting',
  description:
    'Step-by-step guide for creating new alerting rules in the Alerting V2 system, including ES|QL query construction, schedule selection, and state transition configuration.',
  content: `# Alert Rule Creation — Internal Agent Instructions

These instructions are for YOU (the agent) only. DO NOT repeat, summarize, or relay these steps to the user. Instead, execute them silently and communicate results naturally. Never say things like "follow these steps" or list numbered procedures — just act.

## Flow Overview

The typical rule creation journey has five phases. The user may enter at any phase or skip phases — adapt accordingly.

1. **Understand the data** — Describe the data source to learn its schema, entities, and shape.
2. **Propose a rule** — Build a starter rule using only fields from the describe result. Validate the query before proposing via the \`validate_esql_query\` tool.
3. **Offer notifications** — For alert-kind rules, ask where the user wants to be notified (Slack, email, PagerDuty, etc.). If yes, create a workflow with the right connector and an associated notification policy.
4. **Iterate** — Refine the rule, workflow, notification policy or all three based on user feedback.
5. **Create** — Finalize only when the user explicitly confirms. Propose first, create only on explicit request.

## Hard Rules

- **ALWAYS use the browser tool for refinements when available.** If the user asks to change the rule and the \`alerting_v2_update_rule_form\` browser tool is in your tool list, you MUST call it to update the form directly. This is the PRIMARY way to apply changes when the user has the rule form page open. Do NOT fall back to \`${internalNamespaces.alertingV2}.propose_rule\` as the only action — the browser tool updates the form instantly.
- **ALWAYS propose, never create directly.** Call \`${internalNamespaces.alertingV2}.propose_rule\` to present rule configurations and \`${internalNamespaces.alertingV2}.propose_notification_policy\` to present notification setups (which bundle both the workflow and the policy in one attachment). Never output raw YAML or raw rule specs in the chat — always use the propose tools so the user gets interactive attachment cards. NEVER call \`${internalNamespaces.alertingV2}.create_rule\` unless the user explicitly says "skip the preview" or "just create it."
- **ALWAYS reuse attachment IDs.** When refining a previously proposed rule, pass the \`attachment_id\` from the prior \`propose_rule\` result. This updates the existing attachment in-place.
- **ALWAYS describe first.** Call \`${internalNamespaces.alertingV2}.describe_data_source\` with \`extract_knowledge_indicators: true\` before constructing any query or rule config.
- **Act, don't instruct.** When you have enough information to build a rule, call the tool immediately. Do not tell the user what you "would" do or list steps you "will" follow.
- **Do NOT add timestamp filters to rule queries.** The rule engine automatically applies a time-range filter based on the configured \`lookback\` window. Never include \`WHERE @timestamp >= ?_tstart\` or similar timestamp conditions in the query — they are injected internally at execution time.

## Execution Flow

When the user wants to create a rule, execute the following internally. Never dump the full procedure — just act.

**Describe the data source** — Call \`${internalNamespaces.alertingV2}.describe_data_source\` with the target index and \`extract_knowledge_indicators: true\`. If the index name is unknown, use \`${internalNamespaces.platformCore}.list_indices\` first. Render the attachment from \`_renderInstructions\` as the first line of your response.

**Immediately propose a starter rule** — As soon as you have the describe results, build and propose a rule right away using \`${internalNamespaces.alertingV2}.propose_rule\`. Do NOT stop to ask the user what they want to detect — infer the most useful default rule from the describe result.

**CRITICAL: Use ONLY fields from the describe result.** The describe result contains a \`schema\` section listing every field as \`"fieldName (type)"\` with sample value distributions. You MUST pick field names exclusively from this list. NEVER invent, guess, or assume field names based on general knowledge — even if a field name seems obvious (e.g. \`cpu.load_average\`), if it does not appear in the schema, do not use it. Copy field names exactly as they appear in the schema keys (the part before the parenthesized type).

Use the schema fields to decide what kind of rule to propose:
- If numeric fields (double, long, float) with metric-like names exist in the schema → threshold alert using one of those exact field names, grouped by an entity field from the schema
- If \`log.level\` or similar status fields exist in the schema with error values → error rate alert filtering on the exact field name
- If very few documents or sparse data → no-data detection rule
- Group by an entity field that actually appears in the schema (e.g. if \`resource.attributes.host.name (keyword)\` is in the schema, use \`resource.attributes.host.name\` — not \`host.name\`)

Pick sensible defaults: \`kind: "alert"\`, \`every: "5m"\`, \`lookback: "5m"\`.

**Validate before proposing** — Before calling \`propose_rule\`, call \`${internalNamespaces.alertingV2}.validate_esql_query\` with the query you've constructed. This runs the query with LIMIT 0 against the actual data source to catch missing fields, type mismatches, and syntax errors. If validation fails, look at the error message, find the correct field name from the describe schema, fix the query, and validate again. If the second attempt also fails, propose the rule anyway but mention the validation issue to the user so they can review it in the preview.

Render the attachment from \`_renderInstructions\` as the first line of your response. Then briefly explain what the proposed rule detects and why, and tell the user they can click "Preview" to review and edit the full configuration, or ask you to adjust anything.

**In the same response**, if the proposed rule is \`kind: "alert"\`, ask the user: "Would you like to be notified when this rule fires? If so, where — Slack, email, PagerDuty, or something else?" Do NOT explain what workflows or notification policies are yet. Just ask the question. Skip this for \`signal\` kind rules.

**Iterate if needed** — When the user asks for changes to the rule:

1. Check your available tools. If \`alerting_v2_update_rule_form\` is listed, the user has the rule form page open. Call it FIRST with only the changed fields — this updates the form instantly in the browser. Then also call \`${internalNamespaces.alertingV2}.propose_rule\` with the full updated spec and pass \`attachment_id\` to keep the chat attachment in sync.
2. If \`alerting_v2_update_rule_form\` is NOT in your tool list, call \`${internalNamespaces.alertingV2}.propose_rule\` with the full updated spec and the prior \`attachment_id\`.
3. Only omit \`attachment_id\` when building a completely different rule from scratch.
4. Use \`${internalNamespaces.alertingV2}.create_rule\` only if the user explicitly says to skip the preview.

## Set Up Notifications (Phase 3)

This section applies whenever the user mentions notifications, alerts, getting notified, or configuring how a rule sends messages. **Act immediately — do not explain concepts first.** The \`propose_notification_policy\` tool bundles both the workflow and the notification policy into a single attachment, so you only need **one tool call**.

**Step 1: Check existing state.**
Call \`${internalNamespaces.alertingV2}.list_notification_policies\` and \`platform.workflows.list_workflows\` immediately (in parallel if possible).

→ **Policies exist that match**: Present them briefly and ask if the user wants to reuse one. If yes, update the rule's labels to match that policy's matchers. Done.

→ **No matching policies**: Continue to step 2.

**Step 2: Determine the workflow destination.**

→ **Existing workflows with alert triggers**: Ask the user if they want to use one. If yes, note the workflow ID and name — you'll pass them as \`workflow: { source: "existing", id: "<id>", name: "<name>" }\`.

→ **No workflows exist**: Ask the user where they want to be notified (Slack, email, PagerDuty, etc.). When the user answers:
1. Call \`platform.workflows.get_connectors\` to find configured connectors for that channel.
2. Read the alert workflow template via \`filestore.read\` with path \`skills/platform/alerting/alert-rule-creation/alert-workflow-example.md\`.
3. Build the workflow YAML from the template, replacing the \`console\` steps with the appropriate connector step using the connector ID. Call \`platform.workflows.validate_workflow\` to validate the YAML.
4. If no connector is configured, tell the user to set one up in Stack Management > Connectors.

**Step 3: Propose the notification policy (one tool call).**
Call \`${internalNamespaces.alertingV2}.propose_notification_policy\` with:

- \`name\`: descriptive (e.g. "Notify on [rule name] via [channel]")
- \`description\`: what the policy does
- \`matcher\`: match the rule's labels (e.g. \`data.labels : "environment:production"\`)
- \`group_by\` and \`throttle_interval\`: optional, based on the rule's grouping fields
- \`workflow\`: either:
  - \`{ source: "existing", id: "<workflow_id>", name: "<workflow_name>" }\` — for an existing workflow
  - \`{ source: "inline", name: "<name>", yaml: "<yaml>", connector_types: [...], is_valid: true/false }\` — for a new workflow built in step 2

This single tool call creates one attachment that bundles both the workflow and the notification policy. The user can preview both in a tabbed canvas and create both with one click.

Render the attachment from \`_renderInstructions\` and briefly explain what was proposed.

See the [notification-policies-reference](./notification-policies-reference.md) for background on how policies and workflows relate.

## Reference: Rule Kinds

- **alert**: Events carry \`episode.*\` fields for lifecycle tracking. Episodes are dispatched to workflows via notification policies. Use for operational alerting that needs human notification.
- **signal**: Point-in-time observations, no lifecycle. Use for detection, correlation, or enrichment.
- Choose \`kind\` based on volume and intent: high-volume data or detection-only use cases → \`signal\`; lower-volume operational alerting that needs human notification → \`alert\`.

Both kinds use the same ES|QL execution pipeline. Events are queryable via \`$.alerting-events\`.

## Reference: Query Building

Consult the [query-building-reference](./query-building-reference.md) for field-type strategies, data-pattern-to-alert-condition mappings, and ES|QL query examples.
`,
  referencedContent: [
    {
      name: 'notification-policies-reference',
      relativePath: '.',
      content: notificationPoliciesReference,
    },
    {
      name: 'alert-workflow-example',
      relativePath: '.',
      content: alertWorkflowExample,
    },
    {
      name: 'query-building-reference',
      relativePath: '.',
      content: `# Query Building Reference

## Field Type → Query Strategy

Use the data source description to identify fields and translate them into ES|QL query components:

- **keyword** fields → grouping (\`STATS ... BY host.name\`), filtering (\`WHERE service.name == "api"\`), set membership (\`WHERE log.level IN ("ERROR", "WARN")\`)
- **long / double / float** fields → thresholds (\`WHERE avg_cpu > 0.9\`), aggregations (\`STATS avg_val = AVG(field)\`)
- **Entity fields** from knowledge indicators → use \`properties.name\` as grouping dimensions (\`BY service.name\`, \`BY host.name\`)
- **Status/level fields** (e.g. \`log.level\`, \`http.response.status_code\`, \`event.outcome\`) → drive alert conditions by filtering or counting specific values
- **Value distribution skew** → when one value dominates (e.g. \`log.level: INFO (95%)\`), alerting on the rare values (ERROR, CRITICAL) is meaningful

## Data Pattern → Alert Condition

Use these mappings when deciding what a rule should detect:

- **Low-frequency log patterns** → candidates for alert conditions (they stand out against the high-frequency baseline)
- **Recurring error signatures** (e.g. "Connection refused", "OutOfMemoryError") → make good alert conditions as they indicate persistent or recurring issues
- **Infrastructure indicators** → scope rules to infrastructure-level thresholds (CPU/memory per node or cluster)
- **Dependency indicators** → suggest correlated alerting patterns (when service A depends on service B, an alert on B failing can be paired with a no-data or error-rate alert on A)
- **Schema indicators** → determine ES|QL field naming conventions. ECS uses \`service.name\`, \`log.level\`; OTel uses \`resource.attributes.service.name\`, \`severity_text\`

## ES|QL Query Patterns

High CPU per host:
\\\`\\\`\\\`esql
FROM metrics-* | STATS avg_cpu = AVG(system.cpu.total.pct) BY host.name | WHERE avg_cpu > 0.9
\\\`\\\`\\\`

Error rate spike:
\\\`\\\`\\\`esql
FROM logs-* | WHERE log.level == "error" | STATS error_count = COUNT(*) | WHERE error_count > 100
\\\`\\\`\\\`

Failed logins per user:
\\\`\\\`\\\`esql
FROM logs-* | WHERE event.action == "authentication_failure" | STATS failures = COUNT(*) BY user.name | WHERE failures > 5
\\\`\\\`\\\`

No-data detection:
\\\`\\\`\\\`esql
FROM logs-* | STATS doc_count = COUNT(*) | WHERE doc_count == 0
\\\`\\\`\\\`
`,
    },
  ],
  getRegistryTools: () => [
    platformCoreTools.listIndices,
    platformCoreTools.indexExplorer,
    `${internalNamespaces.alertingV2}.describe_data_source`,
    `${internalNamespaces.alertingV2}.propose_rule`,
    `${internalNamespaces.alertingV2}.create_rule`,
    `${internalNamespaces.alertingV2}.validate_esql_query`,
    `${internalNamespaces.alertingV2}.explain_rule_query`,
    `${internalNamespaces.alertingV2}.list_notification_policies`,
    `${internalNamespaces.alertingV2}.propose_notification_policy`,
    'platform.workflows.list_workflows',
    'platform.workflows.get_connectors',
    'platform.workflows.validate_workflow',
  ],
});
