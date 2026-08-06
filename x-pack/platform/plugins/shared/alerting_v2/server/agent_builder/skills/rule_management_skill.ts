/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  ACTION_POLICY_MANAGEMENT_SKILL_ID,
  ALERTING_TOOL_IDS,
  ALERTING_V2_ENABLED_SETTING_ID,
  RULE_MANAGEMENT_SKILL_ID,
} from '@kbn/alerting-v2-constants';
import { manageRuleTool } from '../tools/manage_rule';
import {
  generateRuleSchemaDoc,
  generateRuleOperationsDoc,
  getSeverityValues,
} from './schema_to_skill_docs';

export const createRuleManagementSkill = () =>
  defineSkillType({
    id: RULE_MANAGEMENT_SKILL_ID,
    name: RULE_MANAGEMENT_SKILL_ID,
    basePath: 'skills/platform/alerting',
    description:
      'Compose, discover, and modify alerting V2 rules within a conversation. Use when the user wants to be alerted about conditions in their data — metrics, logs, or any index ("create an alert rule that fires when...", "alert me when CPU goes above...", "set up alerting on my data"). Covers threshold, aggregation, and grouped conditions over any Elasticsearch index. For notification / action policy setup, load the action-policy-management skill. Not for Security/SIEM detection rules (threat detection, MITRE ATT&CK) — use the detection-rule-edit skill for those.',
    experimental: true,
    uiSettingRequired: ALERTING_V2_ENABLED_SETTING_ID,
    referencedContent: [
      {
        name: 'concepts',
        relativePath: './references',
        content: `# Alerting V2 Concepts

## Rule Kind: Alert vs Signal

Rules declare a \`kind\` of \`alert\` or \`signal\`. This is the most important behavioral split in the system.

### Alert (\`kind: alert\`)
- **Stateful alerting** with full episode lifecycle: pending, active, recovering, inactive.
- Supports state transitions (\`pending_count\` / \`recovering_count\`), recovery detection, and notification dispatch.
- Produces \`type: 'alert'\` events that participate in the dispatcher pipeline.
- UI label: **"Alert"**.
- Use when the user wants to be **notified**, needs **lifecycle tracking**, or wants **recovery detection**.

### Signal (\`kind: signal\`)
- **Stateless detection** (observation-only).
- Produces \`type: 'signal'\` events but **skips** episode lifecycle and dispatcher processing entirely.
- No notifications, no recovery, no state transitions.
- UI label: **"Signal"**.
- Use for logging or detection without automated action.

### Immutability
\`kind\` is **immutable on persisted rules** — it can only be set at creation time. The update API rejects changes to \`kind\`. For draft (in-memory) rules, \`set_kind\` can change it freely.

---

## Episode Lifecycle

Episodes are the unit of alert state. Each unique group (by \`group_hash\`) has its own episode.

| Status | Meaning |
|---|---|
| \`pending\` | Breached but below the consecutive-breaches threshold |
| \`active\` | Met the threshold — alert is firing |
| \`recovering\` | Breach stopped but not yet fully recovered |
| \`inactive\` | Fully recovered |

Only \`kind: alert\` rules produce episodes. \`kind: signal\` rules write raw signal events with no episode tracking.

---

## Notifications via Action Policies

Notifications are not configured on the rule itself. Alert episodes are matched and dispatched by **action policies** (notification policies) — space-scoped saved objects that send matched episodes to workflow destinations.

When the user needs notifications (email, Slack, PagerDuty, etc.), load the \`${ACTION_POLICY_MANAGEMENT_SKILL_ID}\` skill. That skill owns action policy CRUD, workflow destination wiring, and the default notification setup flow.

---

## Alert Event Severity

Severity is a per-event property on alert events and episodes, not a rule-level field. It is extracted at execution time from a column named \`severity\` in the ES|QL breach query output.

- **Valid values**: ${getSeverityValues()
          .map((v) => `\`${v}\``)
          .join(', ')} (case-insensitive).
- If the breach query does not produce a \`severity\` column, alert events have no severity.
- Different groups can produce different severities in the same rule execution (the value comes from each row).
- Action policies can match on \`severity\` to route high-severity episodes differently (e.g. PagerDuty for critical, email for low).

### Setting Severity in ES|QL

Severity is set by adding a \`severity\` column to the breach query via \`EVAL\`:

- **Literal severity** — all alerts from the rule share the same severity:
  \`| EVAL severity = "critical"\`
- **Conditional severity** — severity varies per group based on data:
  \`| EVAL severity = CASE(cpu > 0.95, "critical", cpu > 0.8, "high", "medium")\``,
      },
      {
        name: 'rule-schema',
        relativePath: './references',
        content: generateRuleSchemaDoc(),
      },
      {
        name: 'rule-operations-schema',
        relativePath: './references',
        content: generateRuleOperationsDoc(),
      },
    ],
    content: `## Domain Knowledge

For questions about alerting concepts — rule kinds (alert vs signal), episode lifecycle, or how notifications relate to rules — consult the [concepts reference](./references/concepts.md).

---

## When to Use This Skill

Use this skill when:
- A user asks to find, list, inspect, or modify existing alerting V2 rules.
- A user asks to create a new alerting rule from natural language requirements.
- A user asks to change a rule's query, schedule, thresholds, or metadata.

Do **not** use this skill for:
- Creating, inspecting, or modifying action policies (notification policies) — load the \`${ACTION_POLICY_MANAGEMENT_SKILL_ID}\` skill instead.
- Classic (V1) stack, Observability or Security detection rules.
- Action connector configuration (connectors are managed separately).
- Querying or analyzing data — use data exploration skills for that.

---

# Part 1: Rules

## Rule Discovery

When a user asks about existing rules:
- Search with \`platform.core.sml_search\`, using keywords from the user's request.
- For a broad listing, use \`keywords: ["*"]\`.
- Summarize matches in plain language: name, kind, schedule, and query snippet.
- Do **not** attach rules by default when only listing or comparing.
- To inspect or edit a saved rule, attach it with \`platform.core.sml_attach\` using the \`entry_id\` from the search result.
- After attaching, use the returned \`attachment_id\` for subsequent ${ALERTING_TOOL_IDS.manageRule} calls.

## Composing and Modifying Rules

Build the request for ${ALERTING_TOOL_IDS.manageRule} as an ordered \`operations\` array. Operations run in sequence.

For a new rule, start with \`set_metadata\` (name required), then \`set_kind\`, \`set_schedule\`, and \`set_query\`.

For an existing rule, pass the \`ruleAttachmentId\` and only include the operations needed for the changes requested.

## ES|QL Query Guidance

- Every \`set_query\` call **must** include \`format: "composed"\` or \`format: "standalone"\`. Omitting \`format\` will fail validation.
  - **Composed** shares a \`base\` query with appendable \`breach.segment\` and optional \`recovery.segment\`:
    \`{ format: "composed", base: "FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name", breach: { segment: "WHERE avg_cpu > 0.9" } }\`
  - **Standalone** uses independent full queries:
    \`{ format: "standalone", breach: { query: "FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name | WHERE avg_cpu > 0.9" } }\`
- The base query must be a valid ES|QL statement.
- Do **not** include time range filters in the query — the lookback window is applied automatically.
- The query must return rows for an alert to fire. Use \`| WHERE ...\` to filter for breach conditions.
- Prefer \`FROM <index-pattern> | STATS ... BY <group-field> | WHERE <condition>\` for threshold-based alerting.
- **Never** use backtick quoting around index names or field names in ES|QL. Standard index patterns (letters, digits, dashes, dots, underscores, wildcards, and colons for CCS) do not require backticks. Backticks break cross-cluster search and are almost never needed in practice. Write \`FROM remote_cluster:metrics-system.cpu-default\`, not \`FROM \\\`remote_cluster:metrics-system.cpu-default\\\`\`.
- The \`set_schedule\` lookback should be >= the execution interval (\`every\`).
- The \`set_query\` operation validates the query against Elasticsearch automatically.
  If the query references an unknown index or field, the tool will return an error
  with the Elasticsearch error message. Inspect the error, fix the query, and retry.
- If grouping fields are set after a query, they are validated against the query's
  output columns. Use fields that appear in the query results.

## State Transition

Use \`set_state_transition\` to delay alert firing until the threshold is breached N times in a row. This reduces noise from transient spikes.

- \`pending_count: N\` — breaches required before transitioning from pending to active (e.g. \`pending_count: 3\` means 3 consecutive breach cycles).
- \`pending_timeframe\` — optional time window for the pending evaluation (e.g. \`"15m"\`).
- \`recovering_count: N\` — non-breach cycles required before transitioning from recovering to inactive.
- \`recovering_timeframe\` — optional time window for the recovering evaluation.

State transition is only allowed on \`kind: alert\` rules. Refer to the [rule-operations-schema reference](./references/rule-operations-schema.md) for the full field schema.

## Severity

When the user specifies a severity (e.g. "make this a critical alert"), add an \`EVAL severity = "..."\` pipe to the breach query or segment via \`set_query\`. Refer to the [concepts reference](./references/concepts.md) for valid values, the extraction model, and literal vs conditional patterns.

## Recovery Strategy

\`recovery_strategy\` is a **top-level rule field** (not inside the query). It controls how episodes transition from active to recovering/inactive. Signal rules (\`kind: signal\`) cannot set \`recovery_strategy\`.

When using \`recovery_strategy: 'query'\`, add a \`set_query\` operation that includes a \`recovery\` block alongside \`breach\`:
- **Composed**: \`recovery: { segment: 'WHERE cpu < 0.5' }\`
- **Standalone**: \`recovery: { query: 'FROM metrics-* | WHERE cpu < 0.5' }\`

Refer to the [rule-schema reference](./references/rule-schema.md) for allowed values and constraints.

## No-Data Strategy

\`no_data_strategy\` is a **top-level rule field** that controls behaviour when no data is present.

| Value | Behaviour |
|---|---|
| \`'none'\` | No-data situations are ignored (default). |
| \`'emit'\` | Emits a \`no_data\` alert event when no_data query returns no rows for the group. "emit" is not currently accepted by the create/update API. |
| \`'last_known_status'\` | Holds the last known episode status when no data is present. |
| \`'recover'\` | Forces recovery when no data is present. |

When setting \`no_data_strategy\` to anything other than \`'none'\`, add a \`no_data\` block to the standalone query:
\`no_data: { query: 'FROM heartbeat-* | STATS count = COUNT(*) BY host.name | WHERE count >= 1' }\`. For composed query format, the \`base\` query is used as the data query.

Signal rules cannot set \`no_data_strategy\`.
Refer to the [rule-schema reference](./references/rule-schema.md) for allowed values and constraints.

## Final Validation

Always include \`{ operation: "validate" }\` as the **last operation** in the final ${ALERTING_TOOL_IDS.manageRule} call after all fields are set. This validates the accumulated rule against the API request schema and throws if the rule is not ready to save (missing required fields, invalid values, etc.). If validation fails, read the error issues, fix them with corrective operations, and retry with \`validate\` again.

## Rendering Attachments

After calling ${ALERTING_TOOL_IDS.manageRule}, **always** render the rule attachment inline in your response using the \`<render_attachment>\` tag with the attachment ID and version from the tool result:

\`\`\`
<render_attachment id="<ruleAttachment.id>" version="<version>" />
\`\`\`

This displays the interactive rule card with Preview and Create/Update buttons.

## Persistence

The ${ALERTING_TOOL_IDS.manageRule} tool only manages the **in-memory attachment** — it never writes to Elasticsearch.
Always direct the user to the rendered attachment's action buttons for persistence:
- **Create rule** — create a new V2 rule from the in-memory attachment.
- **Update Rule** — push changes back to the origin rule (only for attached saved rules).
- **View in Rules** — navigate to the rule detail page (only for attached saved rules).

Never attempt to create, update, delete, enable, or disable rules directly via API calls.

After composing or modifying a rule, always render it inline for user review:
\`<render_attachment id="{attachmentId}" version="{version}"/>\`
where \`attachmentId\` is \`ruleAttachment.id\` and \`version\` is \`version\` from the ${ALERTING_TOOL_IDS.manageRule} tool result.

---

## Notifications Require Alert Kind

Action policies only process alert episodes. Signal rules (\`kind: signal\`) do not participate in episode lifecycle or notification dispatch.

When a user asks for notifications on a rule that is currently \`kind: signal\` (or when composing a new rule where the user wants notifications):

1. **Explain the difference**: signal rules are observation-only ("Signal") and do not trigger notifications. Alert rules ("Alert") track episode lifecycle and can dispatch to action policies.
2. If the rule is a **draft (in-memory)**: use \`set_kind\` to change it to \`alert\`, then load the \`${ACTION_POLICY_MANAGEMENT_SKILL_ID}\` skill for notification setup.
3. If the rule is **persisted**: \`kind\` is immutable after creation. Inform the user that the existing signal rule cannot be converted. Offer to create a new alert rule with the same query and schedule, then set up notifications on the new rule.
4. After ensuring the rule is \`kind: alert\`, load the \`${ACTION_POLICY_MANAGEMENT_SKILL_ID}\` skill for notification setup.

---

## Offering Notifications After Rule Compose

After composing a complete **alert** rule (has name, query, schedule, and \`kind: alert\`), proactively ask the user:
**"Would you like to set up email notifications for this rule?"**

Do not offer notifications if the rule is still incomplete (missing name, query, or schedule).
If the rule's kind is \`signal\`, follow the "Notifications Require Alert Kind" guidance above before proceeding.

If the user agrees (or asks for notifications directly), load the \`${ACTION_POLICY_MANAGEMENT_SKILL_ID}\` skill via \`filestore.read\` (path: \`skills/platform/alerting/${ACTION_POLICY_MANAGEMENT_SKILL_ID}/SKILL.md\`) and let that skill own the workflow + action policy setup. Do **not** compose action policies or notification workflows from this skill.`,
    getInlineTools: () => [manageRuleTool()],
  });
