/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createDashboardManagementSkill } from './dashboard_management_skill';
import { registerSkills } from './register_skills';
import { dashboardTools } from '../../common';

const skill = createDashboardManagementSkill({
  getCustomContentEnabled: () => Promise.resolve(true),
  getImageBytes: async () => Buffer.from([]),
});

describe('registerSkills', () => {
  it('registers the dashboard management skill', async () => {
    const register = jest.fn();
    const agentBuilder = {
      skills: { register },
    } as unknown as AgentBuilderPluginSetup;

    registerSkills(agentBuilder, {
      getCustomContentEnabled: () => Promise.resolve(true),
      getImageBytes: async () => Buffer.from([]),
    });

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboard-management' }));
  });

  it('includes SML discovery instructions in the skill content', () => {
    expect(skill.content).toContain('platform.core.sml_search');
    expect(skill.content).toContain('platform.core.sml_attach');
  });

  it('points at shared dashboard design practices instead of inlining them', () => {
    expect(skill.content).toContain('dashboard-design-practices');
    expect(skill.content).not.toContain('Dashboard Composition Guidelines');
    expect(skill.content).not.toContain('Grid Packing Rules');

    const design = skill.referencedContent?.find(
      (ref) => ref.name === 'dashboard-design-practices'
    );
    expect(design?.content).toContain('Dashboard Composition Guidelines');
    expect(design?.content).toContain('Grid Packing Rules');
    expect(design?.content).toContain('Available chart types');
    expect(design?.content).toContain('- region_map:');
    expect(design?.content).toContain(
      'Choose for cross-tabulations (e.g. "request methods by status code"'
    );
  });

  it('includes generate-specific chartType operation rules in the skill body', () => {
    expect(skill.content).toContain('Chart Type Guidance');
    expect(skill.content).toContain(
      'provide a new `chartType` when the request changes the chart family'
    );
  });

  it('keeps the Prettify playbook in referenced content instead of the skill body', async () => {
    expect(skill.content).toContain('platform.dashboard.review_dashboard');
    expect(skill.content).toContain('prettify-playbook');
    expect(skill.content).toContain('Without an image, this is a normal dashboard edit');
    expect(skill.content).not.toContain('If every finding was skipped');
    expect(skill.content).not.toContain('rebuilds the visualization');
    expect(skill.content).not.toContain('pack_layout');
    expect(skill.content).not.toContain('disproportionate_size');

    const playbook = skill.referencedContent?.find((ref) => ref.name === 'prettify-playbook');
    expect(playbook?.content).toContain('pack_layout');
    expect(playbook?.content).toContain('weak_sections');
    expect(playbook?.content).toContain('monotone_chart_types');
    expect(playbook?.content).toContain('weak_controls');
    expect(playbook?.content).toContain('duplicate_inner_title');
    expect(playbook?.content).toContain('one_category_chart');
    expect(playbook?.content).toContain('metric_fill');
    expect(playbook?.content).toContain('thin_metric');
    expect(playbook?.content).toContain('hide_title');
    expect(playbook?.content).toContain('clear_metric_fill');
    expect(playbook?.content).toContain('metric_trendline');
    expect(playbook?.content).toContain('add_controls');
    expect(playbook?.content).toContain('rebuilds the visualization');
    expect(playbook?.content).toContain('If every finding was skipped');
    expect(playbook?.content).toContain('Never shrink a data table');
    expect(playbook?.content).toContain('at most once');

    const tools = await skill.getInlineTools?.();
    expect(tools?.map((tool) => tool.id)).toEqual(
      expect.arrayContaining([dashboardTools.generateDashboard, dashboardTools.reviewDashboard])
    );
  });
});
