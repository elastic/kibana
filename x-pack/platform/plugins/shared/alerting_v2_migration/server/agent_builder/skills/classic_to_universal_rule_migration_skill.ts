/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { AvailabilityConfig } from '@kbn/agent-builder-server/availability';
import {
  ALERTING_TOOL_IDS,
  ALERTING_V2_ENABLED_SETTING_ID,
  CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID,
  RULE_AUTHORING_SKILL_ID,
} from '@kbn/alerting-v2-constants';
import type { GetClassicRuleToolDeps } from '../tools/get_classic_rule';
import { getClassicRuleTool } from '../tools/get_classic_rule';
import type { GetMigrationDraftToolDeps } from '../tools/get_migration_draft';
import { getMigrationDraftTool } from '../tools/get_migration_draft';

export type ClassicToUniversalRuleMigrationSkillDeps = GetClassicRuleToolDeps &
  GetMigrationDraftToolDeps & {
    availability: AvailabilityConfig;
  };

export const createClassicToUniversalRuleMigrationSkill = (
  deps: ClassicToUniversalRuleMigrationSkillDeps
) =>
  defineSkillType({
    id: CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID,
    name: CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID,
    basePath: 'skills/platform/alerting',
    description:
      'Inspect a classic (v1) alerting rule and draft its conversion to a universal alerting rule for the user to review and save. Use when the user asks about migrating, converting, or upgrading an existing classic stack rule (for example an Elasticsearch query rule) to universal alerting, or whether a classic rule can be migrated. Not for Security/SIEM detection rules.',
    uiSettingRequired: ALERTING_V2_ENABLED_SETTING_ID,
    availability: deps.availability,
    content: `## When to Use This Skill

Use this skill when a user asks to migrate, convert, or upgrade a classic (v1) alerting rule to a universal alerting rule, or asks whether a classic rule can be migrated.

Do **not** use this skill for:
- Creating or editing universal alerting rules — load the \`${RULE_AUTHORING_SKILL_ID}\` skill instead.
- Security/SIEM detection rules.

## Capabilities

- Draft a classic rule's conversion as a rule attachment with ${ALERTING_TOOL_IDS.getMigrationDraft}.
- Fetch a classic rule's full configuration by id with ${ALERTING_TOOL_IDS.getClassicRule}.

Neither tool creates a universal rule, creates action policies, or changes, disables, or deletes the classic rule. The user saves the draft from the rendered attachment. Do not claim the migration is complete, and do not tell the user the classic rule was disabled.

## Workflow

1. If the user does not give a rule id, ask for it. Do not guess ids.
2. Call ${ALERTING_TOOL_IDS.getMigrationDraft}. It fetches the rule itself and returns an error when the rule's type has no migration, so do not call ${ALERTING_TOOL_IDS.getClassicRule} first.
3. Render the draft, summarize what was converted and what needs attention, and point the user to **Create rule**.
4. Call ${ALERTING_TOOL_IDS.getClassicRule} only when you need the full classic configuration for further reasoning, such as customizing the draft beyond what was converted or working from params the conversion did not carry over.

Rules are read with the user's own classic alerting privileges in the current space: they must be able to read rules of the rule's type for its consumer. The tools cannot read rules in other spaces.

## Drafting a Migration

- Call ${ALERTING_TOOL_IDS.getMigrationDraft} with the classic rule \`id\`. Each call adds a new draft attachment, so do not call it again for a rule that already has a draft in this conversation unless the user asks for a fresh one.
- Errors carry \`metadata.status_code\`: 403 means the user lacks the privilege to read the rule, 404 means it does not exist in this space, 400 means its rule type has no migration, and 500 means the conversion failed unexpectedly. Explain the cause; do not retry.
- **Always** render the draft inline with the attachment id and version from the tool result. The \`version\` attribute is required, even when it is \`1\`:

\`\`\`
<render_attachment id="<ruleAttachment.id>" version="<version>" />
\`\`\`

### What the conversion maps

- Name and tags carry over; the classic rule's check interval becomes the schedule.
- The rule type's migration converts its params into the universal rule query, time field, lookback, and grouping.
- A classic alert delay of N runs becomes N - 1 pending evaluations before the alert is active.
- The investigation guide becomes a runbook artifact and linked dashboards become dashboard artifacts.
- Recovery uses \`no_breach\` and no data is ignored. Mention these defaults when summarizing.

For Elasticsearch query rules, ES|QL queries are split into a base query and a breach segment. DSL and KQL queries cannot be translated: only a \`FROM\` over the source indices is seeded. Tell the user the query must be finished before saving.

### Actions

Classic actions become action policies, returned in \`actionPolicies\`. Action policies are **not** part of the attachment and are **not** created when the user saves the draft. When there are action policies, the draft rule carries a \`migrated-rule:<classic rule id>\` routing tag that they match on. Tell the user the policies still have to be set up for the migrated rule to notify.

Summarize each action policy by its \`policy.name\` and \`stepType\`, and explain its \`notes\`:
- \`templates_replaced\`: the classic mustache message could not be converted, so a default message is used.
- \`connector_required\`: the classic connector (such as a Slack API connector) cannot back the step; a Slack v2 connector must be picked.
- \`alerts_filter_dropped\`: the classic alerts filter has no equivalent and was dropped.

Explain each entry in \`skippedActions\` by its \`reason\`:
- \`unsupported_connector\`: only email and Slack actions can be migrated.
- \`recovery_group\`: recovery actions are not migrated.

### Next steps

- Direct the user to the attachment's **Create rule** button to save the universal rule.
- To change the draft before saving, load the \`${RULE_AUTHORING_SKILL_ID}\` skill and pass \`ruleAttachment.id\` to its manage rule tool.
- Until the user disables it, the classic rule keeps running alongside the new rule, which can cause duplicate notifications.

## Fetching the Full Classic Rule

- Only call ${ALERTING_TOOL_IDS.getClassicRule} after drafting, when the draft result is not enough context. It returns the classic rule's full params, actions, alert delay, and artifacts.
- An unauthorized error means the user lacks the privilege to read that rule; a not found error means it does not exist in this space. Explain the cause; do not retry.`,
    getInlineTools: () => [getClassicRuleTool(deps), getMigrationDraftTool(deps)],
  });
