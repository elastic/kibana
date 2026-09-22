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
} from '@kbn/alerting-v2-constants';
import { manageActionPolicyTool } from '../tools/manage_action_policy';
import type { ManageActionPolicyToolDeps } from '../tools/manage_action_policy';
import {
  generateActionPolicyOperationsDoc,
  generateActionPolicySchemaDoc,
  generateActionPolicyWorkflowPayloadDoc,
} from './schema_to_skill_docs';

export const createActionPolicyManagementSkill = (deps: ManageActionPolicyToolDeps) =>
  defineSkillType({
    id: ACTION_POLICY_MANAGEMENT_SKILL_ID,
    name: ACTION_POLICY_MANAGEMENT_SKILL_ID,
    basePath: 'skills/platform/alerting',
    description:
      'Compose, discover, and modify Alerting V2 action policies (notification policies) within a conversation. Use when the user wants to set up, change, or inspect how alert notifications are matched, grouped, throttled, and dispatched to workflows ("notify me when this rule fires", "set up email notifications for my alert", "create a notification policy", "change my alert to page via PagerDuty", "list my action policies"). Covers workflow destinations, KQL matchers, grouping, and throttling. For composing or editing the underlying alert rules themselves, load the rule-management skill.',
    experimental: true,
    uiSettingRequired: ALERTING_V2_ENABLED_SETTING_ID,
    referencedContent: [
      {
        name: 'concepts',
        relativePath: './references',
        content: `# Action Policy Concepts

## Action Policies (Notification Policies)

An action policy is a **space-scoped saved object** that controls how alert episodes are matched, grouped, throttled, and dispatched to workflow destinations.

Key characteristics:
- **Not embedded in a rule.** One policy can match episodes from many rules.
- **Matcher**: optional KQL query evaluated against episode context. An empty matcher is a catch-all that matches all episodes in the space.
- **Only processes \`kind: alert\` episodes.** Signal events are excluded from the dispatcher pipeline — they never reach action policy evaluation.

### Matcher Context Fields

When the dispatcher evaluates a policy's KQL matcher, these fields are available:

| Field | Description |
|---|---|
| \`episode_id\` | The episode UUID |
| \`episode_status\` | \`inactive\`, \`pending\`, \`active\`, or \`recovering\` |
| \`group_hash\` | Hash of the grouping fields |
| \`last_event_timestamp\` | Timestamp of the most recent event |
| \`rule.id\` | The rule's saved object ID |
| \`rule.name\` | The rule's display name |
| \`rule.tags\` | The rule's tags array |
| \`data.*\` | Rule-specific ES|QL output columns (e.g. \`data.host.name\`, \`data.error_count\`) |

### Grouping Modes
- \`per_episode\` (default): one notification per alert episode lifecycle.
- \`all\`: a single notification for all matching episodes.
- \`per_field\`: group by specified \`groupBy\` fields.

### Throttle Strategies
- \`on_status_change\`: notify only on episode status transitions (default for \`per_episode\`).
- \`per_status_interval\`: notify on transitions and at regular intervals.
- \`time_interval\`: notify at regular intervals regardless of status (default for \`all\`/\`per_field\`).
- \`every_time\`: notify on every evaluation cycle (high volume).

---

## Workflows

A workflow is a **concrete automation defined in YAML** that executes when dispatched by an action policy.

- Workflow steps can use Kibana **connectors** (email, Slack, PagerDuty, etc.) via the \`connector-id\` field on each step.
- Action policy destinations reference **workflow IDs**, never connector IDs directly.
- Destination workflows must use **exactly one** \`triggers: - type: manual\` trigger — never \`alert\`.

---

## Connectors

A connector is a **configured integration instance** (e.g., an email server, a Slack webhook) managed under **Stack Management > Connectors**.

- Referenced inside workflow YAML steps via \`connector-id\`, **not** in action policies.
- The agent **cannot create connectors**. If no suitable connector exists, direct the user to set one up in Stack Management > Connectors.

---

## Dispatch Flow

The end-to-end notification path:

1. **Rule** (\`kind: alert\`) evaluates its ES|QL query and writes alert episodes to \`.rule-events\`.
2. **Dispatcher** (runs on its own Task Manager schedule) reads episodes from \`.rule-events\`.
3. Dispatcher loads **enabled action policies** for the relevant space.
4. **Matcher evaluation**: each policy's KQL matcher is tested against each episode's context.
5. **Grouping**: matched episodes are grouped according to the policy's \`groupingMode\` / \`groupBy\`.
6. **Throttling**: groups are filtered based on the policy's throttle strategy and notification history.
7. **Dispatch**: eligible groups are sent to the policy's **workflow destinations** via \`scheduleWorkflow\`.
8. **Workflow execution**: workflow steps run, using connectors to deliver notifications (email, Slack, etc.).

Signal rules (\`kind: signal\`) are excluded at step 2 — the dispatcher query only selects \`type == 'alert'\` events.`,
      },
      {
        name: 'action-policy-schema',
        relativePath: './references',
        content: generateActionPolicySchemaDoc(),
      },
      {
        name: 'action-policy-operations-schema',
        relativePath: './references',
        content: generateActionPolicyOperationsDoc(),
      },
      {
        name: 'workflow-dispatch-payload',
        relativePath: './references',
        content: generateActionPolicyWorkflowPayloadDoc(),
      },
    ],
    content: `## Domain Knowledge

For questions about action policies, workflows, connectors, or the dispatch flow — consult the [concepts reference](./references/concepts.md).

---

## When to Use This Skill

Use this skill when:
- A user asks to find, list, inspect, or modify action policies (also called notification policies).
- A user asks to create or configure a new action policy with workflow destinations, matchers, grouping, or throttling.
- A user wants to set up notifications (email, Slack, PagerDuty, etc.) for an alert rule.
- The \`rule-management\` skill has handed off after composing a complete alert rule and the user agreed to set up notifications.

Do **not** use this skill for:
- Composing or editing alerting V2 rules themselves — load the \`rule-management\` skill for that.
- Classic (V1) Kibana stack rules or Security detection rules.
- Action connector configuration (connectors are managed separately).
- Querying or analyzing data — use data exploration skills for that.

---

# Part 1: Action Policies (Notification Policies)

Action policies control how alert episodes are matched, grouped, throttled, and dispatched to workflow destinations.

## Action Policy Discovery

When a user asks about existing action policies:
- Search with \`platform.core.sml_search\`, using keywords like the policy name, matcher, or destination.
- Summarize matches: name, enabled/disabled, destination count, matcher snippet, grouping mode.
- To inspect or edit a saved policy, attach it with \`platform.core.sml_attach\` using the \`entry_id\`.
- After attaching, use the returned \`attachment_id\` for subsequent ${ALERTING_TOOL_IDS.manageActionPolicy} calls.

## Composing and Modifying Action Policies

Build the request for ${ALERTING_TOOL_IDS.manageActionPolicy} as an ordered \`operations\` array. Operations run in sequence.

For a new policy, start with \`set_metadata\` (name required), then \`set_destinations\`.

For an existing policy, pass the \`actionPolicyAttachmentId\` and only include the operations for the requested changes.

Refer to the [action-policy-operations-schema reference](./references/action-policy-operations-schema.md) for every operation's fields, types, and constraints. Grouping modes and throttle strategies are also summarized in the [concepts reference](./references/concepts.md).

Action policies are always space-scoped: they match alerts from any rule in the space unless the matcher narrows them. To scope a policy to a single rule, set a matcher of \`rule.id: "<ruleId>"\` via \`set_matcher\`. Matcher context fields are listed in the concepts reference.

### Throttle / Grouping Compatibility

The throttle strategy must be compatible with the grouping mode:
- For \`per_episode\`: \`on_status_change\`, \`per_status_interval\`, \`every_time\`.
- For \`all\` / \`per_field\`: \`time_interval\`, \`every_time\`.
- \`per_status_interval\` and \`time_interval\` require an \`interval\` (e.g. \`"5m"\`, \`"1h"\`).

If you set both in one request, put \`set_grouping\` before \`set_throttle\`. The tool validates compatibility after all operations run.

## Final Validation

Always include \`{ operation: "validate" }\` as the **last operation** in the final ${ALERTING_TOOL_IDS.manageActionPolicy} call after all fields are set. This validates the accumulated policy against the API request schema and throws if the policy is not ready to save (missing required fields, invalid values, etc.). If validation fails, read the error issues, fix them with corrective operations, and retry with \`validate\` again.

## Action Policy Persistence

The ${ALERTING_TOOL_IDS.manageActionPolicy} tool only manages the **in-memory attachment** — it never writes to Elasticsearch.
Always direct the user to the rendered attachment's action buttons for persistence:
- **Create policy** — create a new action policy from the in-memory attachment.
- **Update Policy** — push changes back to the origin policy (only for attached saved policies).

Never attempt to create, update, delete, enable, or disable action policies directly via API calls.

After composing or modifying an action policy, always render it inline for user review:
\`<render_attachment id="{attachmentId}" version="{version}"/>\`
where \`attachmentId\` is \`actionPolicyAttachment.id\` and \`version\` is \`version\` from the ${ALERTING_TOOL_IDS.manageActionPolicy} tool result.

---

# Part 2: Default Notification Setup

When setting up notifications for a complete **alert** rule (has name, query, schedule, and \`kind: alert\`) — either after the user agreed to the rule-management skill's notification offer, or when the user directly asks for notifications — follow these two steps in order.

Action policies only process alert episodes. If the rule is \`kind: signal\`, do not proceed: ask the user (or the rule-management skill) to convert or recreate the rule as \`kind: alert\` first.

## Step 1 — Create a Default Workflow

1. Load the \`workflow-authoring\` skill via \`filestore.read\` (path: \`skills/platform/workflows\`).
2. Call \`platform.workflows.get_connectors\` with \`actionTypeId: ".email"\` to find an available email connector.
   - If no email connector exists, tell the user: "No email connector is configured. You can set one up under Stack Management → Connectors, then come back to add notifications."
3. Generate a unique \`workflowId\` — a UUID (e.g. \`550e8400-e29b-41d4-a716-446655440000\`). Pass it as the \`workflowId\` parameter when calling \`platform.core.generate_workflow\`. This same ID will be used as the persisted workflow ID and must be referenced in the action policy destination. **Do NOT use a human-readable slug** — it would collide across conversations.
4. Call \`platform.core.generate_workflow\` with the \`workflowId\` and a natural-language description that includes the YAML template tailored to the rule's query columns (paste the template into the \`query\` or \`instructions\` parameter).

### Building the Workflow YAML

The workflow template should reference the rule's ES|QL output columns explicitly via \`ep.data.*\`.
Those columns are the fields that appear in \`episodes[].data\` when the rule fires — the rule
executor writes each ES|QL result row as \`data: rowDoc\` on alert events.
If the output columns are unclear, run the rule's ES|QL with \`| LIMIT 0\` to discover column names and types.

For a rule with query: \`FROM logs-* | STATS error_count = COUNT(*) BY host.name | WHERE error_count >= 5\`

Use this template structure:

\`\`\`yaml
version: '1'
name: "Notify: <rule-name>"
enabled: true
triggers:
  - type: manual
steps:
  - name: send_email
    type: email
    connector-id: <connector-id>
    with:
      to:
        - <user-provided-email>
      subject: "Alert: <rule-name> — {{ inputs.payload.episodes | size }} episode(s)"
      message: >
        Rule "<rule-name>" triggered {{ inputs.payload.episodes | size }} alert episode(s).

        {% for ep in inputs.payload.episodes %}
        - Host: {{ ep.data.host.name | default: "unknown" }}
          Errors: {{ ep.data.error_count | default: "n/a" }}
          Status: {{ ep.episode_status }}
        {% endfor %}

        View execution: {{ execution.url }}
\`\`\`

**Key rules for the template:**

- Use **exactly one** \`triggers: - type: manual\` (never \`alert\`, never \`event.*\`).
- Liquid payload fields: [workflow dispatch payload](./references/workflow-dispatch-payload.md)
  (prefer \`inputs.payload.rules[ep.rule_id].name\`). Engine vars (\`execution.url\`, etc.) come from
  the \`workflow-authoring\` skill.
- Reference \`ep.data.*\` from the rule's ES|QL columns; dotted names nest
  (\`ep.data.host.name\`, not \`ep.data["host.name"]\`).
- Guard empty \`data\` on recovering/inactive (\`| default\` or \`{% if ep.data %}\`).

5. After creating the workflow, render it inline for user review:
   \`<render_attachment id="{attachmentId}" version="{attachmentVersion}"/>\`
   where \`attachmentId\` and \`attachmentVersion\` come from the \`generate_workflow\` tool result.
6. Use the \`workflowId\` you generated in step 3 for action policy destinations in Step 2. Do NOT use the \`attachmentId\` — that is only for rendering.

## Step 2 — Create a Default Action Policy

Use ${ALERTING_TOOL_IDS.manageActionPolicy} with these operations in order:

1. \`set_metadata\`: name = \`"Notify on <rule-name>"\`, description = \`"Default notification for <rule-name>"\`
2. \`set_destinations\`: \`[{ type: "workflow", id: "<workflowId-from-step-1>" }]\`
   - **IMPORTANT**: Use the \`workflowId\` you generated in step 3 (passed to \`generate_workflow\`), NOT the \`attachmentId\`. The \`workflowId\` is the stable workflow ID used for persistence and cross-references. Using the attachment ID will cause a validation error.
3. \`set_matcher\`: \`rule.id: "<ruleId>"\`
   - Use the \`ruleId\` value from the \`manage_rule\` tool result to scope this policy to the new rule. This ID is pre-assigned when the rule attachment is created and will become the saved-object ID when the user clicks "Create rule".
   - The \`ruleId\` is always available — even for unsaved/proposed rules — so you never need to ask the user to save the rule first.
   - If the user explicitly requests a cross-rule or shared policy, omit the \`rule.id\` matcher (or use a broader matcher) so it matches alerts from any rule in the space.
4. \`set_grouping\`: \`per_episode\`
5. \`set_throttle\`: \`{ strategy: "on_status_change" }\`

Render the action policy inline for user review:
\`<render_attachment id="{attachmentId}" version="{version}"/>\`
where \`attachmentId\` is \`actionPolicyAttachment.id\` and \`version\` is \`version\` from the ${ALERTING_TOOL_IDS.manageActionPolicy} tool result.

## Save Order Reminder

After rendering all three attachments (rule, workflow, action policy), remind the user of the required save order:

> "To activate this alerting setup, please save in order: **Rule → Workflow → Action Policy**. The action policy depends on both the rule and the workflow being saved first."

## Customization Hints

After creating the defaults, briefly mention:
- They can use a different connector type (Slack, PagerDuty, etc.) — offer to use \`platform.workflows.get_connectors\` to explore.
- They can change the throttle strategy — \`on_status_change\` (default) only notifies on transitions, \`every_time\` notifies on every evaluation cycle.
- They can broaden the policy to cover multiple rules by removing the \`rule.id\` matcher or replacing it with a broader matcher.`,
    getInlineTools: () => [manageActionPolicyTool(deps)],
  });
