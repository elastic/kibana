/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools, platformCoreTools } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createDashboardsSkill } from './dashboards_skill';
import { ENHANCE_GUIDANCE_PATH } from './generation_guidance/enhance_guidance';
import { registerSkills } from './register_skills';

const skill = createDashboardsSkill({ getValidateDashboard: jest.fn() });

const enhanceGuidance = (): string => {
  const reference = skill.referencedContent?.find((item) => item.name === 'enhance');
  if (!reference) {
    throw new Error('dashboards skill is missing enhance referenced content');
  }
  return reference.content;
};

describe('registerSkills', () => {
  it('registers the dashboards skill', async () => {
    const register = jest.fn();
    const agentBuilder = {
      skills: { register },
    } as unknown as AgentBuilderPluginSetup;

    registerSkills(agentBuilder, { getValidateDashboard: jest.fn() });

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboards' }));
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

  it('loads the enhance workflow from referenced content', () => {
    expect(skill.content).toContain(ENHANCE_GUIDANCE_PATH);
    expect(skill.content).toContain('read_file');
    expect(skill.content).toContain('Do not enhance without reading it');
    expect(skill.content).not.toContain('How would you like to enhance this dashboard?');
    expect(skill.referencedContent).toEqual([
      expect.objectContaining({
        name: 'enhance',
        relativePath: '.',
        content: expect.stringContaining('Improving an Existing Dashboard (Enhance)'),
      }),
    ]);
  });

  it('delegates enhance presentation defaults to the chart author', () => {
    const guidance = enhanceGuidance();
    expect(guidance).toContain('applyChartRules: true');
    expect(guidance).toContain('Edit every existing ES|QL Lens panel');
    expect(guidance).toContain('preserveESQL: true');
    expect(guidance).toContain(
      'omit `preserveESQL` and describe only that change alongside the enhancement request'
    );
    // Lens mechanics stay with the chart author.
    expect(skill.content).not.toContain('apply_color_to');
    expect(guidance).not.toContain('apply_color_to');
    expect(skill.content).not.toContain('CHART RULES FOR');
    expect(guidance).not.toContain('CHART RULES FOR');
  });

  it('assesses the dashboard and asks which enhance mode to apply', () => {
    const guidance = enhanceGuidance();
    expect(guidance).toContain(
      `Call \`${platformCoreTools.getIndexMapping}\` once per distinct index pattern`
    );
    expect(guidance).toContain('Do not run queries by default');
    expect(guidance).toContain(`call \`${internalTools.askUserQuestion}\` on its own`);
    expect(guidance).toContain('"How would you like to enhance this dashboard?"');
    expect(guidance).toContain('"Appearance and content" and "Appearance only"');
    expect(guidance).toContain('Ask even when you found no gaps');
    expect(guidance).toContain('Content mode is the default');
    expect(guidance).toContain('If the request already says what to change, do not call');
  });

  it('separates appearance-only and content enhance modes', () => {
    const guidance = enhanceGuidance();
    expect(guidance).toContain('**Appearance mode.** Keep every chart panel id');
    expect(guidance).toContain('Markdown panels may be rewritten or removed.');
    expect(guidance).toContain(
      'Do not add, remove, or recreate other panels, add controls, or change queries'
    );
    expect(guidance).toContain(
      "Skip this step when the user's message already asks for appearance only"
    );
    expect(guidance).toContain('**Content mode.** Do everything appearance mode does');
    expect(guidance).toContain('Remove panels that meet the removal criteria with `remove`');
    expect(guidance).toContain(
      'replace non-ES|QL panels with new ES|QL Lens content under the same id without asking again'
    );
    expect(guidance).toContain('Keep the existing time range');
    expect(guidance).toContain('In content mode, confirm the resulting panel set');
  });

  it('inlines chart-type selection in the skill body so the dashboard agent sees it', () => {
    expect(skill.content).toContain('Chart Type Guidance');
    expect(skill.content).toContain('Available chart types');
    expect(skill.content).toContain('- region_map:');
    expect(skill.content).toContain('only when the terms are short strings');
  });
});
