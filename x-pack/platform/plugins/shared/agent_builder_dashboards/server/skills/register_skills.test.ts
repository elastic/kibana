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

  it('routes new dashboard visualizations through source:request, not create_visualization', () => {
    expect(dashboardManagementSkill.description).toContain('source:"request"');
    expect(dashboardManagementSkill.description).toContain('do not call create_visualization first');
    expect(dashboardManagementSkill.content).toContain('source: "request"');
    expect(dashboardManagementSkill.content).toContain('renderer: "vega"');
    expect(dashboardManagementSkill.content).toContain('do **not** call create_visualization first');
  });
});
