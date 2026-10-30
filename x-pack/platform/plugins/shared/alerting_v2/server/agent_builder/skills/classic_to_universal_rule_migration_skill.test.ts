/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import {
  ALERTING_TOOL_IDS,
  ALERTING_V2_ENABLED_SETTING_ID,
  CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID,
} from '@kbn/alerting-v2-constants';
import { createLoggerService } from '../../lib/services/logger_service/logger_service.mock';
import { createClassicToUniversalRuleMigrationSkill } from './classic_to_universal_rule_migration_skill';

describe('createClassicToUniversalRuleMigrationSkill', () => {
  const availability = {
    cacheMode: 'none' as const,
    handler: async () => ({ status: 'available' as const }),
  };

  const createSkill = () =>
    createClassicToUniversalRuleMigrationSkill({
      logger: createLoggerService().loggerService,
      getClassicRulesClient: jest.fn(),
      getClassicRuleTypeMigration: jest.fn(),
      availability,
    });

  it('defines an allowlisted skill gated on the alerting v2 setting', async () => {
    const skill = createSkill();

    expect(skill.id).toBe(CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID);
    expect(skill.name).toBe(CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID);
    expect(skill.basePath).toBe('skills/platform/alerting');
    expect(isAllowedBuiltinSkill(skill.id)).toBe(true);
    expect(skill.uiSettingRequired).toBe(ALERTING_V2_ENABLED_SETTING_ID);
    expect(skill.availability).toBe(availability);
    await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
  });

  it('exposes the get_classic_rule and get_migration_draft inline tools', async () => {
    const tools = await createSkill().getInlineTools?.();

    expect(tools?.map(({ id }) => id)).toEqual([
      ALERTING_TOOL_IDS.getClassicRule,
      ALERTING_TOOL_IDS.getMigrationDraft,
    ]);
  });

  it('documents that classic actions are not migrated', () => {
    expect(createSkill().content).toContain('Classic actions are **not** migrated');
  });
});
