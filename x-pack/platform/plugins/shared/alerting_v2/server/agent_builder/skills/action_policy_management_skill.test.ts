/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_POLICY_MANAGEMENT_SKILL_ID, ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import type { ManageActionPolicyToolDeps } from '../tools/manage_action_policy';
import { createActionPolicyManagementSkill } from './action_policy_management_skill';

const createDeps = (): ManageActionPolicyToolDeps => ({
  getWorkflow: jest.fn(async () => null),
  getAvailableConnectors: jest.fn(async () => ({ connectorTypes: {} })),
});

describe('createActionPolicyManagementSkill', () => {
  it('registers the skill under the stable action-policy-management id and name', () => {
    const skill = createActionPolicyManagementSkill(createDeps());

    expect(skill.id).toBe(ACTION_POLICY_MANAGEMENT_SKILL_ID);
    expect(skill.name).toBe(ACTION_POLICY_MANAGEMENT_SKILL_ID);
    expect(skill.basePath).toBe('skills/platform/alerting');
  });

  it('marks the skill as experimental so it is gated behind agent builder experimental features', () => {
    const skill = createActionPolicyManagementSkill(createDeps());

    expect(skill.experimental).toBe(true);
  });

  it('gates the skill on the alerting:v2:enabled advanced setting', () => {
    const skill = createActionPolicyManagementSkill(createDeps());

    expect(skill.uiSettingRequired).toBe('alerting:v2:enabled');
  });

  it('exposes only the manage action policy inline tool', async () => {
    const skill = createActionPolicyManagementSkill(createDeps());

    const inlineTools = (await skill.getInlineTools?.()) ?? [];
    const inlineToolIds = inlineTools.map((tool) => tool.id);

    expect(inlineToolIds).toEqual([ALERTING_TOOL_IDS.manageActionPolicy]);
    expect(inlineToolIds).not.toContain(ALERTING_TOOL_IDS.manageRule);
  });

  it('includes action policy discovery and default notification setup instructions', () => {
    const skill = createActionPolicyManagementSkill(createDeps());

    expect(skill.content).toContain('Action Policy Discovery');
    expect(skill.content).toContain('Default Notification Setup');
    expect(skill.content).toContain('workflow-authoring');
  });

  it('exposes the generated workflow dispatch payload schema as referenced content', () => {
    const skill = createActionPolicyManagementSkill(createDeps());
    const payloadRef = skill.referencedContent?.find(
      (entry) => entry.name === 'workflow-dispatch-payload'
    );

    expect(payloadRef?.content).toContain('Action Policy Workflow Dispatch Payload');
    expect(payloadRef?.content).toContain('`policyId`');
    expect(payloadRef?.content).toContain('`episodes`');
    expect(payloadRef?.content).toContain('`rules`');
    expect(payloadRef?.content).toContain('`episode_status`');
  });
});
