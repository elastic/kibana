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

  it('lazily exposes the dashboard design guidance via referenced content rather than the skill body', () => {
    const designReference = dashboardManagementSkill.referencedContent?.find(
      (reference) => reference.name === 'dashboard-design'
    );

    expect(designReference).toBeDefined();
    // Both composition and layout detail live in the referenced file...
    expect(designReference?.content).toContain('Dashboard Composition Guidelines');
    expect(designReference?.content).toContain('Grid Packing Rules');
    // ...and are not inlined up front in the skill body.
    expect(dashboardManagementSkill.content).not.toContain('Dashboard Composition Guidelines');
    expect(dashboardManagementSkill.content).not.toContain('Grid Packing Rules');
    // The skill body still points the agent at the referenced file.
    expect(dashboardManagementSkill.content).toContain('dashboard-design.md');
  });
});
