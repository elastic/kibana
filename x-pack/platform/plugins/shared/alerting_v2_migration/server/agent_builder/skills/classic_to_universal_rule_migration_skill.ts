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
      'Inspect classic (v1) alerting rules as the first step of migrating them to universal alerting rules. Use when the user asks about migrating, converting, or upgrading an existing classic stack rule (for example an Elasticsearch query rule) to universal alerting. Not for Security/SIEM detection rules.',
    uiSettingRequired: ALERTING_V2_ENABLED_SETTING_ID,
    availability: deps.availability,
    content: `## When to Use This Skill

Use this skill when a user asks to migrate, convert, or upgrade a classic (v1) alerting rule to a universal alerting rule, or asks whether a classic rule can be migrated.

Do **not** use this skill for:
- Creating or editing universal alerting rules — load the \`${RULE_AUTHORING_SKILL_ID}\` skill instead.
- Security/SIEM detection rules.

## Current Capabilities

This skill is a stub. It can fetch a classic rule by id with ${ALERTING_TOOL_IDS.getClassicRule} and draft its conversion as a rule attachment with ${ALERTING_TOOL_IDS.getMigrationDraft}. It cannot create rules itself.

## Fetching a Classic Rule

- Call ${ALERTING_TOOL_IDS.getClassicRule} with the classic rule \`id\`. If the user does not know the id, ask for it.
- The rule is read with the user's own classic alerting privileges. If the tool returns an unauthorized error, tell the user they lack the privilege to read that rule; do not retry.
- Summarize the rule in plain language: name, rule type, consumer, schedule, enabled state, and number of actions.
- Report \`migratable\`: when \`false\`, tell the user the rule's type has no migration to universal alerting yet.

## Drafting a Migration

- Call ${ALERTING_TOOL_IDS.getMigrationDraft} with the classic rule \`id\`. It adds the universal rule the classic rule would become to the conversation as a rule attachment. No rule is saved and the classic rule is unchanged.
- Errors carry \`metadata.status_code\`: 403 means the user lacks the privilege to read the rule, 404 means it does not exist in this space, and 400 means its rule type has no migration. Explain the cause; do not retry.
- **Always** render the draft inline with the attachment id and version from the tool result. The \`version\` attribute is required, even when it is \`1\`:

\`\`\`
<render_attachment id="<ruleAttachment.id>" version="<version>" />
\`\`\`

- Summarize the draft: the converted query and schedule, each action policy (and its \`notes\`, such as a connector that must be picked), and each skipped action with its reason. Action policies are not part of the attachment.
- Direct the user to the attachment's **Create rule** button to save the universal rule. To change the draft, load the \`${RULE_AUTHORING_SKILL_ID}\` skill and pass \`ruleAttachment.id\` to its manage rule tool.`,
    getInlineTools: () => [getClassicRuleTool(deps), getMigrationDraftTool(deps)],
  });
