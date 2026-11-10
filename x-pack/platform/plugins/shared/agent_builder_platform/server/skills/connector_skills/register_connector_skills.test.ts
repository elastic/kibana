/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { isAllowedSkillRegistration } from '@kbn/agent-builder-server/allow_lists';
import { CONNECTORS_SKILLS_BASE_PATH } from '@kbn/agent-builder-server/skills';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { getAllConnectorSkills, getConnectorSkillRegistryId } from '@kbn/connector-specs';
import { registerConnectorSkills } from './register_connector_skills';

const registerSkillsWith = () => {
  const register = jest.fn();
  registerConnectorSkills({ skills: { register } } as unknown as AgentBuilderPluginSetup, {
    getActionsStart: jest.fn() as unknown as () => Promise<ActionsPluginStart>,
  });
  return register.mock.calls.map(([skill]) => skill);
};

describe('registerConnectorSkills', () => {
  it('registers one built-in skill for each connector skill', () => {
    const registered = registerSkillsWith();
    const expectedIds = getAllConnectorSkills().map(({ skill }) =>
      getConnectorSkillRegistryId(skill)
    );

    expect(expectedIds.length).toBeGreaterThan(0);
    expect(registered.map((skill) => skill.id)).toEqual(expectedIds);
    expect(expectedIds).toEqual(
      expect.arrayContaining(['platform.connectors.github', 'platform.connectors.pagerduty'])
    );
  });

  it('registers hidden skills under the connectors path, with the workflow and list_connectors tools', async () => {
    for (const skill of registerSkillsWith()) {
      expect(skill.basePath).toBe(CONNECTORS_SKILLS_BASE_PATH);
      expect(skill.hidden).toBe(true);
      expect(skill.excludeFromElasticCapabilities).toBe(true);
      expect(await skill.getRegistryTools?.()).toEqual([platformCoreTools.executeWorkflow]);
      const inlineTools = (await skill.getInlineTools?.()) ?? [];
      expect(inlineTools.map((tool: { id: string }) => tool.id)).toEqual(['list_connectors']);
    }
  });

  it('maps the connector skill resources to referenced content', () => {
    const github = registerSkillsWith().find((skill) => skill.id === 'platform.connectors.github');
    const spec = getAllConnectorSkills().find(({ skill }) => skill.id === 'github')?.skill;

    expect(github?.referencedContent).toEqual(
      spec?.resources?.map(({ name, relativePath, content }) => ({ name, relativePath, content }))
    );
    expect(github?.referencedContent?.length).toBeGreaterThan(0);
  });

  it('produces skills that pass Agent Builder validation and the registration allow list', async () => {
    for (const skill of registerSkillsWith()) {
      expect(isAllowedSkillRegistration(skill)).toBe(true);
      await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    }
  });
});
