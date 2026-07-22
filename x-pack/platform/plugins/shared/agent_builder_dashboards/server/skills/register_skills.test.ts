/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { dashboardManagementSkill } from './dashboard_management_skill';
import { registerSkills } from './register_skills';

describe('registerSkills', () => {
  it('registers the dashboard management skill', async () => {
    const register = jest.fn();
    const agentBuilder = {
      skills: { register },
    } as unknown as AgentBuilderPluginSetup;

    await registerSkills(agentBuilder);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(dashboardManagementSkill);
  });

  it('includes SML discovery instructions in the skill content', () => {
    expect(dashboardManagementSkill.content).toContain('platform.core.sml_search');
    expect(dashboardManagementSkill.content).toContain('platform.core.sml_attach');
  });

  it('inlines the dashboard design guidance directly in the skill body', () => {
    expect(dashboardManagementSkill.content).toContain('Dashboard Composition Guidelines');
    expect(dashboardManagementSkill.content).toContain('Grid Packing Rules');
  });

  it('keeps the prettify design pass as referenced content', () => {
    expect(dashboardManagementSkill.content).toContain(
      './references/prettifying-existing-dashboard.md'
    );
    expect(dashboardManagementSkill.content).not.toContain('prettifyPanelConfigs');
    expect(dashboardManagementSkill.referencedContent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'prettifying-existing-dashboard',
          relativePath: './references',
          content: expect.stringMatching(
            /do not set `prettifyPanelConfigs`[\s\S]*inner visualization agent[\s\S]*configGeneratorChanges/
          ),
        }),
      ])
    );
  });
});
