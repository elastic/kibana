/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { dashboardManagementSkill as skill } from './dashboard_management_skill';
import { registerSkills } from './register_skills';

describe('registerSkills', () => {
  it('registers the dashboard management skill', async () => {
    const register = jest.fn();
    const agentBuilder = {
      skills: { register },
    } as unknown as AgentBuilderPluginSetup;

    registerSkills(agentBuilder);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboard-management' }));
  });

  it('includes SML discovery instructions in the skill content', () => {
    expect(skill.content).toContain('platform.core.sml_search');
    expect(skill.content).toContain('platform.core.sml_attach');
  });

  it('teaches the target generate_dashboard vocabulary', () => {
    expect(skill.content).toContain('How should I enhance this dashboard?');
    expect(skill.content).toContain('normalize_panels');
    expect(skill.content).toContain('set_layout');
    expect(skill.content).toContain('intent.legend_statistics');
  });

  it('does not teach grid arithmetic or banned legend prose', () => {
    expect(skill.content).not.toContain('grid: { x');
    expect(skill.content).not.toContain('Grid Packing Rules');
    expect(skill.content).not.toContain('48 columns');
    expect(skill.content).not.toContain('show avg/min/max in the legend');
  });
});
