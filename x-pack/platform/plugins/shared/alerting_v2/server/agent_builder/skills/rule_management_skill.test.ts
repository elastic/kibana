/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACTION_POLICY_MANAGEMENT_SKILL_ID,
  ALERTING_TOOL_IDS,
  RULE_MANAGEMENT_SKILL_ID,
} from '@kbn/alerting-v2-constants';
import { createRuleManagementSkill } from './rule_management_skill';

describe('createRuleManagementSkill', () => {
  it('registers the skill under the stable rule-management id and name', () => {
    const skill = createRuleManagementSkill();

    expect(skill.id).toBe(RULE_MANAGEMENT_SKILL_ID);
    expect(skill.name).toBe(RULE_MANAGEMENT_SKILL_ID);
    expect(skill.basePath).toBe('skills/platform/alerting');
  });

  it('marks the skill as experimental so it is gated behind agent builder experimental features', () => {
    const skill = createRuleManagementSkill();

    expect(skill.experimental).toBe(true);
  });

  it('gates the skill on the alerting:v2:enabled advanced setting', () => {
    const skill = createRuleManagementSkill();

    expect(skill.uiSettingRequired).toBe('alerting:v2:enabled');
  });

  it('exposes only the manage rule inline tool', async () => {
    const skill = createRuleManagementSkill();

    const inlineTools = (await skill.getInlineTools?.()) ?? [];
    const inlineToolIds = inlineTools.map((tool) => tool.id);

    expect(inlineToolIds).toEqual([ALERTING_TOOL_IDS.manageRule]);
    expect(inlineToolIds).not.toContain(ALERTING_TOOL_IDS.manageActionPolicy);
  });

  it('defers notification and action policy setup to the action-policy-management skill', () => {
    const skill = createRuleManagementSkill();

    expect(skill.description).toContain(ACTION_POLICY_MANAGEMENT_SKILL_ID);
    expect(skill.content).toContain(ACTION_POLICY_MANAGEMENT_SKILL_ID);
    expect(skill.content).toContain('Would you like to set up email notifications for this rule?');
    expect(skill.content).not.toContain('Part 2: Action Policies');
    expect(skill.content).not.toContain('Part 3: Default Notification Setup');
  });
});
