/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools, platformCoreTools } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createDashboardsSkill } from './dashboards_skill';
import { registerSkills } from './register_skills';

const skill = createDashboardsSkill({ getDashboardStateSchema: jest.fn() });
const enhanceContent =
  skill.referencedContent?.find(({ name }) => name === 'enhance-dashboard')?.content ?? '';

describe('registerSkills', () => {
  it('registers the dashboards skill', async () => {
    const register = jest.fn();
    const agentBuilder = {
      skills: { register },
    } as unknown as AgentBuilderPluginSetup;

    registerSkills(agentBuilder, { getDashboardStateSchema: jest.fn() });

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboards' }));
  });

  it('includes SML discovery instructions in the skill content', () => {
    expect(skill.content).toContain('platform.core.sml_search');
    expect(skill.content).toContain('platform.core.sml_attach');
  });

  it('inlines the dashboard composition guidance and leaves the grid to the layout step', () => {
    expect(skill.content).toContain('Dashboard Composition Guidelines');
    expect(enhanceContent).toContain('The layout is arranged automatically');
    expect(skill.content).not.toContain('Grid Packing Rules');
    expect(skill.content).toContain('show avg/min/max in the legend');
    expect(skill.content).toContain('at least one and at most two of those primary time-series XY');
  });

  it('delegates enhance presentation defaults to the chart author', () => {
    expect(skill.content).toContain('`enhance-dashboard.md`');
    expect(skill.content).not.toContain('Edit every existing ES|QL Lens panel');
    expect(enhanceContent).toContain('Improving an Existing Dashboard (Enhance)');
    expect(enhanceContent).toContain('applyChartRules: true');
    expect(enhanceContent).toContain('Edit every existing ES|QL Lens panel');
    expect(enhanceContent).toContain('preserveESQL: true');
    expect(enhanceContent).toContain(
      'omit `preserveESQL` and describe only that change alongside the enhancement request'
    );
    // Lens mechanics stay with the chart author.
    expect(skill.content).not.toContain('apply_color_to');
    expect(skill.content).not.toContain('CHART RULES FOR');
    expect(enhanceContent).not.toContain('apply_color_to');
  });

  it('assesses the dashboard and asks which enhance mode to apply', () => {
    expect(enhanceContent).toContain(
      `Call \`${platformCoreTools.getIndexMapping}\` once per distinct index pattern`
    );
    expect(enhanceContent).toContain('Do not run queries by default');
    expect(enhanceContent).toContain(`call \`${internalTools.askUserQuestion}\` on its own`);
    expect(enhanceContent).toContain('"How would you like to enhance this dashboard?"');
    expect(enhanceContent).toContain('"Appearance and content" and "Appearance only"');
    expect(enhanceContent).toContain('Ask even when you found no gaps');
    expect(enhanceContent).toContain('Content mode is the default');
    expect(enhanceContent).toContain('If the request already says what to change, do not call');
  });

  it('separates appearance-only and content enhance modes', () => {
    expect(enhanceContent).toContain('**Appearance mode.** Keep every chart panel id');
    expect(enhanceContent).toContain('Markdown panels may be rewritten or removed.');
    expect(enhanceContent).toContain(
      'Do not add, remove, or recreate other panels, add controls, or change queries'
    );
    expect(enhanceContent).toContain(
      "Skip this step when the user's message already asks for appearance only"
    );
    expect(enhanceContent).toContain('**Content mode.** Do everything appearance mode does');
    expect(enhanceContent).toContain('Remove panels that meet the removal criteria with `remove`');
    expect(enhanceContent).toContain(
      'replace non-ES|QL panels with new ES|QL Lens content under the same id without asking again'
    );
    expect(enhanceContent).toContain('Keep the existing time range');
    expect(enhanceContent).toContain('In content mode, confirm the resulting panel set');
  });

  it('inlines chart-type selection in the skill body so the dashboard agent sees it', () => {
    expect(skill.content).toContain('Chart Type Guidance');
    expect(skill.content).toContain('Available chart types');
    expect(skill.content).toContain('- region_map:');
    expect(skill.content).toContain('only when the terms are short strings');
  });
});
