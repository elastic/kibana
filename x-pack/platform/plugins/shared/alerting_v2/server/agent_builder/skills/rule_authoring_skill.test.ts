/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACTION_POLICY_AUTHORING_SKILL_ID,
  ALERTING_TOOL_IDS,
  RULE_AUTHORING_SKILL_ID,
} from '@kbn/alerting-v2-constants';
import { isAllowedBuiltinTool } from '@kbn/agent-builder-server/allow_lists';
import { RULE_BUILDER_TYPES } from '@kbn/alerting-v2-rule-builders';
import type { LoggerServiceContract } from '../../lib/services/logger_service/logger_service';
import { createAlertingV2Availability } from './alerting_v2_availability';
import { createRuleAuthoringSkill } from './rule_authoring_skill';

const createDeps = () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    forSubsystem: jest.fn(),
  } as unknown as LoggerServiceContract,
  availability: createAlertingV2Availability({
    getActiveSpace: jest.fn().mockResolvedValue({}),
  }),
});

describe('createRuleAuthoringSkill', () => {
  it('generates schema docs without throwing', () => {
    expect(() => createRuleAuthoringSkill(createDeps())).not.toThrow();
  });

  it('registers the skill under the stable rule-authoring id and name', () => {
    const skill = createRuleAuthoringSkill(createDeps());

    expect(skill.id).toBe(RULE_AUTHORING_SKILL_ID);
    expect(skill.name).toBe(RULE_AUTHORING_SKILL_ID);
    expect(skill.basePath).toBe('skills/platform/alerting');
  });

  it('is not gated behind agent builder experimental features', () => {
    const skill = createRuleAuthoringSkill(createDeps());

    expect(skill.experimental).not.toBe(true);
  });

  it('gates the skill on the alerting:v2:enabled advanced setting', () => {
    const skill = createRuleAuthoringSkill(createDeps());

    expect(skill.uiSettingRequired).toBe('alerting:v2:enabled');
  });

  it('stays available when universal alerting experimental features are disabled', async () => {
    const skill = createRuleAuthoringSkill(createDeps());
    const uiSettings = { get: jest.fn().mockResolvedValue(false) };

    await expect(
      skill.availability?.handler({ request: {}, uiSettings } as never)
    ).resolves.toEqual({
      status: 'available',
    });
    expect(uiSettings.get).not.toHaveBeenCalled();
  });

  it('exposes the builder list, the draft custom rule tool and one draft tool per rule builder', async () => {
    const skill = createRuleAuthoringSkill(createDeps());

    const inlineTools = (await skill.getInlineTools?.()) ?? [];
    const inlineToolIds = inlineTools.map((tool) => tool.id);

    expect(inlineToolIds).toEqual([
      ALERTING_TOOL_IDS.listRuleBuilders,
      ALERTING_TOOL_IDS.draftCustomRule,
      ...Object.values(RULE_BUILDER_TYPES).map(
        ({ type }) => `platform.alerting.draft_${type}_rule`
      ),
    ]);
    expect(inlineToolIds).not.toContain(ALERTING_TOOL_IDS.manageActionPolicy);
  });

  it('registers every inline tool in the Agent Builder allow list', async () => {
    const skill = createRuleAuthoringSkill(createDeps());

    const inlineTools = (await skill.getInlineTools?.()) ?? [];

    for (const { id } of inlineTools) {
      expect(isAllowedBuiltinTool(id)).toBe(true);
    }
  });

  it('leaves builder tools to the builder list and the rule attachments', () => {
    const skill = createRuleAuthoringSkill(createDeps());

    expect(skill.content).toContain('Call `platform.alerting.list_rule_builders`');
    expect(skill.content).toContain('Every rule attachment lists the tools that edit it.');
    for (const { type } of Object.values(RULE_BUILDER_TYPES)) {
      expect(skill.content).not.toContain(`draft_${type}_rule`);
      expect(skill.content).not.toContain(`update_${type}_rule`);
    }
  });

  it('defers notification and action policy setup to the action-policy-authoring skill', () => {
    const skill = createRuleAuthoringSkill(createDeps());

    expect(skill.description).toContain(ACTION_POLICY_AUTHORING_SKILL_ID);
    expect(skill.content).toContain(ACTION_POLICY_AUTHORING_SKILL_ID);
    expect(skill.content).toContain('Would you like to set up email notifications for this rule?');
    expect(skill.content).not.toContain('Part 2: Action Policies');
    expect(skill.content).not.toContain('Part 3: Default Notification Setup');
  });
});
