/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools, platformCoreTools } from '@kbn/agent-builder-common';
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

  it('delegates enhance presentation defaults to the chart author', () => {
    expect(skill.content).toContain('Improving an Existing Dashboard (Enhance)');
    expect(skill.content).toContain('applyChartRules: true');
    expect(skill.content).toContain('for every existing ES|QL Lens panel');
    expect(skill.content).toContain('preserveESQL: true');
    expect(skill.content).toContain(
      'a query change and presentation enhancement can share one edit'
    );
    // Lens mechanics stay with the chart author.
    expect(skill.content).not.toContain('apply_color_to');
    expect(skill.content).not.toContain('CHART RULES FOR');
  });

  it('assesses the dashboard and asks which enhance mode to apply', () => {
    expect(skill.content).toContain(
      `Call \`${platformCoreTools.getIndexMapping}\` once per distinct index pattern`
    );
    expect(skill.content).toContain('Do not run queries by default');
    expect(skill.content).toContain(`call \`${internalTools.askUserQuestion}\` on its own`);
    expect(skill.content).toContain('"Appearance only" and "Appearance and content"');
    expect(skill.content).toContain('Ask even when you found no gaps');
    expect(skill.content).toContain('Content mode is the default');
    expect(skill.content).toContain(
      "Skip this step only when the user's message already states a mode or names specific changes"
    );
  });

  it('separates appearance-only and content enhance modes', () => {
    expect(skill.content).toContain('**Appearance mode.** Keep every panel ID');
    expect(skill.content).toContain(
      'Do not add, remove, or recreate panels, add controls, or change queries'
    );
    expect(skill.content).toContain('**Content mode.** Do everything appearance mode does');
    expect(skill.content).toContain('`remove_panels`');
    expect(skill.content).toContain(
      'replace non-ES|QL panels with new ES|QL Lens panels without asking again'
    );
    expect(skill.content).toContain('Keep the existing time range');
    expect(skill.content).toContain('In content mode, confirm the resulting panel set');
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
