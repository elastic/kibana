/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { manageRuleTool } from '../tools/manage_rule';
import { alertingTools } from '../common/constants';

export const ruleManagementSkill = defineSkillType({
  id: 'rule-management',
  name: 'rule-management',
  basePath: 'skills/platform/alerting',
  description:
    'Compose, discover, and modify alerting V2 rules within a conversation using ES|QL-based queries.',
  content: `## When to Use This Skill

Use this skill when:
- A user asks to find, list, inspect, or modify existing alerting V2 rules.
- A user asks to create a new alerting rule from natural language requirements.
- A user asks to change a rule's query, schedule, thresholds, or metadata.

Do **not** use this skill for:
- Classic (V1) Kibana stack rules or Security detection rules.
- Notification policy or action connector configuration.
- Querying or analyzing data — use data exploration skills for that.

## Rule Discovery

When a user asks about existing rules:
- Search with \`platform.core.sml_search\`, using keywords from the user's request.
- For a broad listing, use \`keywords: ["*"]\`.
- Summarize matches in plain language: name, kind, schedule, and query snippet.
- Do **not** attach rules by default when only listing or comparing.
- To inspect or edit a saved rule, attach it with \`platform.core.sml_attach\` using the \`chunk_id\` from the search result.
- After attaching, use the returned \`attachment_id\` for subsequent ${alertingTools.manageRule} calls.

## Composing and Modifying Rules

Build the request for ${alertingTools.manageRule} as an ordered \`operations\` array. Operations run in sequence.

For a new rule, start with \`set_metadata\` (name required), then \`set_kind\`, \`set_schedule\`, and \`set_query\`.

For an existing rule, pass the \`ruleAttachmentId\` and only include the operations needed for the changes requested.

## ES|QL Query Guidance

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

## State Transition and Recovery

- \`set_state_transition\` with \`consecutive_breaches: N\` means the rule fires only after N consecutive evaluation cycles breach the threshold. Use this when the user wants to reduce noise.
- \`set_recovery_policy\` with \`type: "no_breach"\` recovers when a cycle produces no rows. Use \`type: "query"\` with a separate recovery query when the user needs explicit recovery detection.

## Persistence

The ${alertingTools.manageRule} tool only manages the **in-memory attachment** — it never writes to Elasticsearch.
Always direct the user to the rendered attachment's action buttons for persistence:
- **Create rule** — create a new V2 rule from the in-memory attachment.
- **Update Rule** — push changes back to the origin rule (only for attached saved rules).
- **View in Rules** — navigate to the rule detail page (only for attached saved rules).

Never attempt to create, update, delete, enable, or disable rules directly via API calls.`,
  getInlineTools: () => [manageRuleTool()],
});
