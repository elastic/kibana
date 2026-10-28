/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { isAllowedBuiltinSkill, isAllowedBuiltinTool } from '@kbn/agent-builder-server/allow_lists';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import {
  ALERTING_TOOL_IDS,
  ALERTING_V2_ENABLED_SETTING_ID,
  CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID,
} from '@kbn/alerting-v2-constants';
import { createClassicToUniversalRuleMigrationSkill } from './classic_to_universal_rule_migration_skill';

describe('createClassicToUniversalRuleMigrationSkill', () => {
  const availability = {
    cacheMode: 'none' as const,
    handler: async () => ({ status: 'available' as const }),
  };

  const createSkill = () =>
    createClassicToUniversalRuleMigrationSkill({
      logger: loggingSystemMock.createLogger(),
      getClassicRulesClient: jest.fn(),
      isMigratable: jest.fn(),
      availability,
    });

  it('defines an allowlisted skill gated on the alerting v2 setting', async () => {
    const skill = createSkill();

    expect(skill.id).toBe(CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID);
    expect(isAllowedBuiltinSkill(skill.id)).toBe(true);
    expect(skill.uiSettingRequired).toBe(ALERTING_V2_ENABLED_SETTING_ID);
    expect(skill.availability).toBe(availability);
    await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
  });

  it('exposes only the get_classic_rule inline tool', async () => {
    const tools = await createSkill().getInlineTools?.();

    expect(tools?.map(({ id }) => id)).toEqual([ALERTING_TOOL_IDS.getClassicRule]);
    expect(isAllowedBuiltinTool(ALERTING_TOOL_IDS.getClassicRule)).toBe(true);
  });
});
