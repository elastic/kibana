/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools } from '@kbn/agent-builder-common/tools';
import {
  ACTION_POLICY_AUTHORING_SKILL_ID,
  ALERTING_API_IDS,
  ALERTING_TOOL_IDS,
  RULE_AUTHORING_SKILL_ID,
} from '@kbn/alerting-v2-constants';
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
  getRulesClient: jest.fn(),
  getPrivilegeChecker: jest.fn(),
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

  it('exposes only the rule inline tools to manage and attach rules', async () => {
    const skill = createRuleAuthoringSkill(createDeps());

    const inlineTools = (await skill.getInlineTools?.()) ?? [];
    const inlineToolIds = inlineTools.map((tool) => tool.id);

    expect(inlineToolIds).toEqual([ALERTING_TOOL_IDS.manageRule, ALERTING_TOOL_IDS.attachRule]);
    expect(inlineToolIds).not.toContain(ALERTING_TOOL_IDS.manageActionPolicy);
  });

  it('points the agent to the Kibana API tools to discover existing rules', () => {
    const skill = createRuleAuthoringSkill(createDeps());

    expect(skill.content).toContain(ALERTING_API_IDS.listRules);
    expect(skill.content).toContain(ALERTING_API_IDS.getRule);
    expect(skill.content).toContain(internalTools.describeApi);
    expect(skill.content).toContain(internalTools.executeApi);
    expect(skill.content).toContain(ALERTING_TOOL_IDS.attachRule);
  });

  it('references API operation ids that exist, and are read-only, in the Kibana API registry', async () => {
    const { kibanaManifest } = await import('@elastic/schemas/kibana/tools/manifest.js');

    Object.values(ALERTING_API_IDS).forEach((apiId) => {
      expect(kibanaManifest.find(({ id }) => id === apiId)).toEqual(
        expect.objectContaining({ readOnly: true, destructive: false })
      );
    });
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
