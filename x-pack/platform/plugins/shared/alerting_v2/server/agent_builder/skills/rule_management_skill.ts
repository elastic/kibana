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
import type { ManageRuleToolDeps } from '../tools/manage_rule';
import { manageRuleTool } from '../tools/manage_rule';
import {
  generateRuleOperationsDoc,
  generateRuleKindDoc,
  generateEpisodeLifecycleDoc,
  generateSeverityDoc,
  generateRecoveryStrategyDoc,
  generateNoDataStrategyDoc,
  generateNotificationsOverviewDoc,
} from './schema_to_skill_docs';

export const createRuleManagementSkill = (deps: ManageRuleToolDeps) =>
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
        name: 'rule-kind',
        relativePath: './references',
        content: generateRuleKindDoc(),
      },
      {
        name: 'episode-lifecycle',
        relativePath: './references',
        content: generateEpisodeLifecycleDoc(),
      },
      {
        name: 'alert-event-severity',
        relativePath: './references',
        content: generateSeverityDoc(),
      },
      {
        name: 'recovery-strategy',
        relativePath: './references',
        content: generateRecoveryStrategyDoc(),
      },
      {
        name: 'no-data-strategy',
        relativePath: './references',
        content: generateNoDataStrategyDoc(),
      },
      {
        name: 'notifications-overview',
        relativePath: './references',
        content: generateNotificationsOverviewDoc(),
      },
    ],
    content: `## When to Use This Skill

Use this skill when:
- A user asks to find, list, inspect, or modify existing alerting rules.
- A user asks to create a new alerting rule from natural language requirements.
- A user asks to change a rule's query, schedule, thresholds, or metadata.

Do **not** use this skill for:
- Creating, inspecting, or modifying action policies — load the \`${ACTION_POLICY_MANAGEMENT_SKILL_ID}\` skill instead.
- Classic (V1) stack, Observability or Security detection rules.
- Action connector configuration (connectors are managed separately).
- Querying or analyzing data — use data exploration skills for that.

---

## Rule Discovery

When a user asks about existing rules:
- Search with \`platform.core.sml_search\`, using keywords from the user's request.
- For a broad listing, use \`keywords: ["*"]\`.
- Summarize matches in plain language: name, kind, schedule, and query snippet.
- Do **not** attach rules by default when only listing or comparing.
- To inspect or edit a saved rule, attach it with \`platform.core.sml_attach\` using the \`entry_id\` from the search result.
- After attaching, use the returned \`attachment_id\` for subsequent ${
      ALERTING_TOOL_IDS.manageRule
    } calls.

## Composing and Modifying Rules

Build the request for ${
      ALERTING_TOOL_IDS.manageRule
    } as an ordered \`operations\` array. Operations run in sequence.

For a new rule, start with \`set_metadata\` (name required), then \`set_kind\`, \`set_schedule\`, and \`set_query\`.

For an existing rule, pass the \`ruleAttachmentId\` and only include the operations needed for the changes requested.

See the [rule-kind reference](./references/rule-kind.md) when choosing between \`alert\` and \`signal\`.

${generateRuleOperationsDoc()}

## ES|QL Query Guidance

- Every \`set_query\` call **must** include \`format: "composed"\` or \`format: "standalone"\`. Omitting \`format\` will fail validation.
  - **Composed** shares a \`base\` query with appendable \`breach.segment\` and optional \`recovery.segment\`:
    \`{ format: "composed", base: "FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name", breach: { segment: "WHERE avg_cpu > 0.9" } }\`
    Omit \`breach\` to treat every row returned by \`base\` as a breach.
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

## Final Validation

Always include \`{ operation: "validate" }\` as the **last operation** in the final ${
      ALERTING_TOOL_IDS.manageRule
    } call after all fields are set. This validates the accumulated rule against the API request schema and throws if the rule is not ready to save (missing required fields, invalid values, etc.). If validation fails, read the error issues, fix them with corrective operations, and retry with \`validate\` again.

## Rendering Attachments

After calling ${
      ALERTING_TOOL_IDS.manageRule
    }, **always** render the rule attachment inline in your response using the \`<render_attachment>\` tag with the attachment ID and version from the tool result:

\`\`\`
<render_attachment id="<ruleAttachment.id>" version="<version>" />
\`\`\`

This displays the interactive rule card with Preview and Create/Update buttons.

## Persistence

The ${
      ALERTING_TOOL_IDS.manageRule
    } tool only manages the **in-memory attachment** — it never writes to Elasticsearch.
Always direct the user to the rendered attachment's action buttons for persistence:
- **Create rule** — create a new V2 rule from the in-memory attachment.
- **Update Rule** — push changes back to the origin rule (only for attached saved rules).
- **View in Rules** — navigate to the rule detail page (only for attached saved rules).

Never attempt to create, update, delete, enable, or disable rules directly via API calls.

After composing or modifying a rule, always render it inline for user review:
\`<render_attachment id="{attachmentId}" version="{version}"/>\`
where \`attachmentId\` is \`ruleAttachment.id\` and \`version\` is \`version\` from the ${
      ALERTING_TOOL_IDS.manageRule
    } tool result.

---

## Offering Notifications After Rule Compose

After composing a complete **alert** rule (has name, query, schedule, and \`kind: alert\`), proactively ask the user:
**"Would you like to set up email notifications for this rule?"**

Do not offer notifications if the rule is still incomplete (missing name, query, or schedule).
If the rule's kind is \`signal\`, follow **Notifications Require Alert Kind** in the [notifications-overview reference](./references/notifications-overview.md) before proceeding.

If the user agrees, load the \`${ACTION_POLICY_MANAGEMENT_SKILL_ID}\` skill via \`filestore.read\` (path: \`skills/platform/alerting/${ACTION_POLICY_MANAGEMENT_SKILL_ID}/SKILL.md\`). Do **not** compose action policies or notification workflows from this skill.

---

## When to Load References

### Rule Kind
When the user asks whether a rule should notify, record events only, or about the difference between Alerts and Events, consult the [rule-kind reference](./references/rule-kind.md).

### Episode Lifecycle
When the user asks what \`active\` / \`pending\` / \`recovering\` / \`inactive\` means, why an alert has not fired yet, or how group state works, consult the [episode-lifecycle reference](./references/episode-lifecycle.md).

### Severity
When the user specifies a severity (e.g. "make this a critical alert"), add an \`EVAL severity = "..."\` pipe to the breach query or segment via \`set_query\`. Consult the [alert-event-severity reference](./references/alert-event-severity.md) for valid values, the extraction model, and literal vs conditional patterns.

### Recovery Strategy
When the user wants alerts to recover only when a condition is met, to never recover, or asks how recovery is detected, set \`recovery_strategy\` on \`set_query\`. Consult the [recovery-strategy reference](./references/recovery-strategy.md).

### No-Data Strategy
When the user asks what happens if data stops arriving (missing metrics, heartbeat, "keep the last status"), set \`no_data_strategy\` on \`set_query\`. Consult the [no-data-strategy reference](./references/no-data-strategy.md).

### Notifications
When the user asks for email, Slack, PagerDuty, or how rules send notifications, consult the [notifications-overview reference](./references/notifications-overview.md).`,
    getInlineTools: () => [manageRuleTool(deps)],
  });
