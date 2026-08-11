/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createDashboardManagementSkill } from './dashboard_management_skill';
import { registerSkills } from './register_skills';

const skill = createDashboardManagementSkill(false);

describe('registerSkills', () => {
  it('registers the dashboard management skill', async () => {
    const register = jest.fn();
    const agentBuilder = {
      skills: { register },
    } as unknown as AgentBuilderPluginSetup;

    registerSkills(agentBuilder, false);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboard-management' }));
  });

  it('includes SML discovery instructions in the skill content', () => {
    expect(skill.content).toContain('platform.core.sml_search');
    expect(skill.content).toContain('platform.core.sml_attach');
  });

  it('inlines the dashboard design guidance directly in the skill body', () => {
    expect(skill.content).toContain('Dashboard Composition Guidelines');
    expect(skill.content).toContain('Grid Packing Rules');
  });

  it('includes the shared chart type selection guidance', () => {
    expect(skill.content).toContain('Chart Type Guidance');
    expect(skill.content).toContain('Available chart types:');
    expect(skill.content).toContain('- region_map:');
    expect(skill.content).toContain(
      "Choose 'mosaic' when visualizing the joint distribution of two categorical dimensions"
    );
    expect(skill.content).toContain(
      'provide a new `chartType` when the request changes the chart family'
    );
  });

  it('omits custom content guidance when the feature flag is disabled', () => {
    expect(skill.content).not.toContain('type: "custom_content"');
    expect(skill.content).not.toContain('When to use custom content:');
  });

  it('includes custom content guidance when the feature flag is enabled', () => {
    const enabledSkill = createDashboardManagementSkill(true);

    expect(enabledSkill.content).toContain('type: "custom_content"');
    expect(enabledSkill.content).toContain('When to use custom content:');
    expect(enabledSkill.content).toContain('Creating a custom content panel:');
    expect(enabledSkill.content).toContain('Editing a custom content panel:');
  });
});
