/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManageActionPolicyToolDeps } from '../tools/manage_action_policy';
import { alertingTools } from '../common/constants';
import { createRuleManagementSkill } from './rule_management_skill';

const createDeps = (): ManageActionPolicyToolDeps => ({
  getWorkflow: jest.fn(async () => null),
  getAvailableConnectors: jest.fn(async () => ({ connectorTypes: {} })),
});

describe('createRuleManagementSkill', () => {
  it('registers the skill under the stable rule-management id and name', () => {
    const skill = createRuleManagementSkill(createDeps());

    expect(skill.id).toBe('rule-management');
    expect(skill.name).toBe('rule-management');
    expect(skill.basePath).toBe('skills/platform/alerting');
  });

  it('marks the skill as experimental so it is gated behind agent builder experimental features', () => {
    const skill = createRuleManagementSkill(createDeps());

    expect(skill.experimental).toBe(true);
  });

  it('gates the skill on the alerting:v2:enabled advanced setting', () => {
    const skill = createRuleManagementSkill(createDeps());

    expect(skill.uiSettingRequired).toBe('alerting:v2:enabled');
  });

  it('exposes the manage rule and manage action policy inline tools', async () => {
    const skill = createRuleManagementSkill(createDeps());

    const inlineTools = (await skill.getInlineTools?.()) ?? [];
    const inlineToolIds = inlineTools.map((tool) => tool.id);

    expect(inlineToolIds).toEqual(
      expect.arrayContaining([alertingTools.manageRule, alertingTools.manageActionPolicy])
    );
  });
});
