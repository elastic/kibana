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

  it('inlines dashboard authoring rules in the skill body', () => {
    expect(skill.content).toContain('Lead with high-level metrics');
    expect(skill.content).toContain('do not make a single-value metric or gauge full-width');
    expect(skill.content).toContain('3–5 `options_list_control` dropdowns');
    expect(skill.content).toContain('show avg/min/max in the legend');
    expect(skill.content).toContain('at least one and at most two of those primary time-series XY');
    expect(skill.content).not.toContain('is a miss');
  });

  it('asks which prettify categories to fix before applying review corrections', () => {
    expect(skill.content).toContain('## Prettifying a Dashboard');
    expect(skill.content).toContain('data.review.problems');
    expect(skill.content).toContain('ask_user_question');
    expect(skill.content).toContain('**Layout**');
    expect(skill.content).toContain('**Chart styling**');
    expect(skill.content).toContain('**Structure**');
    expect(skill.description).toContain('at most twice');
    expect(skill.content).toContain('once at the start of this conversation round');
    expect(skill.content).toContain('at most twice');
    expect(skill.content).toContain('A third call is forbidden');
    expect(skill.content).toContain('once more');
    expect(skill.content).toContain('Do not keep generating or rendering until the review is empty');
    expect(skill.content).toContain('hypotheses');
    expect(skill.content).not.toContain('first generate of a new dashboard only');
    expect(skill.content).not.toContain('Later updates omit');
    expect(skill.content).not.toContain('Do not call generation again just to fix them');
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
