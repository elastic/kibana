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

  it('inlines the dashboard design guidance directly in the skill body', () => {
    expect(skill.content).toContain('Dashboard Composition Guidelines');
    expect(skill.content).toContain('Grid Packing Rules');
    expect(skill.content).toContain('show avg/min/max in the legend');
    expect(skill.content).toContain('at least one and at most two of those primary time-series XY');
  });

  it('inlines the shared chart design guidance and the prettify workflow', () => {
    expect(skill.content).toContain('CHART DESIGN GUIDANCE');
    expect(skill.content).toContain('COLOR GUIDANCE');
    expect(skill.content).toContain('Improving an Existing Dashboard (Prettify)');
    expect(skill.content).toContain('appearanceOnly: true');
    // Lens JSON mechanics stay with the config author.
    expect(skill.content).not.toContain('apply_color_to');
    expect(skill.content).not.toContain('CONFIGURATION RULES');
  });

  it('exposes the Kibana palette catalog as a referenced file', () => {
    const catalog = skill.referencedContent?.find(({ name }) => name === 'color-palettes');
    expect(catalog?.content).toContain('KIBANA PALETTE CATALOG');
    expect(catalog?.content).toContain('- Status: #');
    expect(skill.content).toContain('`color-palettes` reference file');
  });

  it('inlines chart-type selection in the skill body so the dashboard agent sees it', () => {
    expect(skill.content).toContain('Chart Type Guidance');
    expect(skill.content).toContain('Available chart types');
    expect(skill.content).toContain('- region_map:');
    expect(skill.content).toContain('only when the terms are short strings');
    expect(skill.content).toContain(
      'provide a new `chartType` when the request changes the chart family'
    );
  });
});
