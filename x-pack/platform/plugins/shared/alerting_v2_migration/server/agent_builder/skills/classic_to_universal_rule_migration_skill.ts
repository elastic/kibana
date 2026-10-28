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

export type ClassicToUniversalRuleMigrationSkillDeps = GetClassicRuleToolDeps & {
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

This skill is a stub. It can only fetch a classic rule by id with ${ALERTING_TOOL_IDS.getClassicRule}. It cannot convert or create rules yet.

## Fetching a Classic Rule

- Call ${ALERTING_TOOL_IDS.getClassicRule} with the classic rule \`id\`. If the user does not know the id, ask for it.
- The rule is read with the user's own classic alerting privileges. If the tool returns an unauthorized error, tell the user they lack the privilege to read that rule; do not retry.
- Summarize the rule in plain language: name, rule type, consumer, schedule, enabled state, and number of actions.
- Report \`migratable\`: when \`false\`, tell the user the rule's type has no migration to universal alerting yet.`,
    getInlineTools: () => [getClassicRuleTool(deps)],
  });
