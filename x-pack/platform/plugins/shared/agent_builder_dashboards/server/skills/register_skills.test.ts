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

  it('includes the shared chart type selection guidance', () => {
    expect(dashboardManagementSkill.content).toContain('Chart Type Guidance');
    expect(dashboardManagementSkill.content).toContain('Available chart types:');
    expect(dashboardManagementSkill.content).toContain('- region_map:');
    expect(dashboardManagementSkill.content).toContain(
      "Choose 'mosaic' when visualizing the joint distribution of two categorical dimensions"
    );
    expect(dashboardManagementSkill.content).toContain(
      'provide a new `chartType` when the request changes the chart family'
    );
  });

  it('inlines the layout guidance for reworking an existing dashboard', () => {
    expect(dashboardManagementSkill.content).toContain('Vertical gaps close by themselves');
    expect(dashboardManagementSkill.content).toContain(
      'Keep every panel at the size its chart type'
    );
    expect(dashboardManagementSkill.content).toContain('never `w` and `h`');
    expect(dashboardManagementSkill.content).toContain('Inserting above an existing section');
  });

  describe('panel editing reference', () => {
    const reference = (dashboardManagementSkill.referencedContent ?? []).find(
      ({ name }) => name === 'panel-editing'
    );

    it('defers the panel editing details to a referenced file', () => {
      expect(reference?.content).toContain('Panels that can be edited in place');
      expect(reference?.content).toContain('Wait for confirmation before removing or replacing');
    });

    it('tells the skill body to read the file before every edit', () => {
      expect(dashboardManagementSkill.content).toContain(
        `${reference?.relativePath}/${reference?.name}.md`
      );
      expect(dashboardManagementSkill.content).toContain('before any `edit_panels` call');
    });
  });
});
