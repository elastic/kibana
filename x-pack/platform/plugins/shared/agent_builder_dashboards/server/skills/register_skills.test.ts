/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { dashboardManagementSkill as skill } from './dashboard_management_skill';
import { registerSkills } from './register_skills';
import { dashboardTools } from '../../common';

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

  it('tells the agent to read_file every referenced_files path before generate', () => {
    expect(skill.content).toContain('referenced_files');
    expect(skill.content).toContain('read_file');
    expect(skill.content).toContain(`Before calling \`${dashboardTools.generateDashboard}\``);
    expect(skill.content).toContain('every path in `referenced_files`');
    expect(skill.content).not.toContain('Dashboard Composition Guidelines');
    expect(skill.referencedContent?.map((ref) => ref.name)).toEqual(
      expect.arrayContaining(['prettify-rules', 'dashboard-design-practices'])
    );
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
    expect(design?.content).toContain('**XY (line / area / bar)** → `w: 24, h: 10`');
    expect(design?.content).not.toContain('Use full-width (`w: 48`) for the primary time series');
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
    expect(skill.content).toContain('let the visualization author decide how to apply it');
    expect(skill.content).toContain(
      'Omit the `esql` field on visualization panels unless you received a validated query'
    );
    expect(skill.content).toContain(
      '`add_section.panels` creates new panels — never copy existing configs into it'
    );
    expect(skill.content).toContain(platformCoreTools.getIndexMapping);
    expect(skill.content).toContain('must exist in that mapping **and** appear in panel ES|QL');
    expect(skill.content).toContain('Never invent ECS field names');
    expect(skill.content).not.toContain(
      'Use `add_section` with its optional `panels` array when you already know the panels that belong in the new section'
    );
    expect(skill.content).not.toContain('clear_metric_fill');
    expect(skill.content).not.toContain('metric_trendline');
  });

  it('tells the agent to judge a Prettify screenshot itself and apply via generate', async () => {
    expect(skill.content).toContain('look at the screenshot yourself');
    expect(skill.content).toContain('title-intent vs painted content');
    expect(skill.content).toContain('Prefer modify and expand');
    expect(skill.content).toContain('plain language');
    expect(skill.content).toContain('Do not name Hard rule or Creative');
    expect(skill.content).toContain(dashboardTools.generateDashboard);
    expect(skill.content).toContain('Without an image, this is a normal dashboard edit');
    expect(skill.content).not.toContain('Do not call any tools');
    expect(skill.content).not.toContain('Do not call `platform.dashboard.generate_dashboard`');
    expect(skill.content).not.toContain('Do not read the image');
    expect(skill.content).not.toContain('platform.dashboard.review_dashboard');
    expect(skill.content).not.toContain('prettify-playbook');
    expect(skill.content).not.toContain('pack_layout');
    expect(skill.content).not.toContain('prettify_dashboard');

    const rules = skill.referencedContent?.find((ref) => ref.name === 'prettify-rules');
    expect(rules?.content).toContain('**Hard rule**');
    expect(rules?.content).toContain('**Creative**');
    expect(rules?.content).toContain('These buckets are for you');
    expect(rules?.content).toContain('never show them to the user');
    expect(rules?.content).toContain('plain language');
    expect(rules?.content).toContain('Do not quote grid units');
    expect(rules?.content).toContain('Title intent vs painted content');
    expect(rules?.content).toContain('Do not invent colors');
    expect(rules?.content).toContain(
      'Invented metric static colors and BACKGROUND fills must be removed'
    );
    expect(rules?.content).toContain('pie, table, XY, and metric');
    expect(rules?.content).toContain('Custom colors that do not add meaning');
    expect(rules?.content).toContain('Default palette');
    expect(rules?.content).toContain('NEVER show the dashboard chrome title on a metric');
    expect(rules?.content).toContain('In most cases, enrich the metric');
    expect(rules?.content).toContain('secondary metric with dynamic coloring');
    expect(rules?.content).toContain('If the secondary is a trend');
    expect(rules?.content).toContain('it must not have a title');
    expect(rules?.content).toContain('background chart');
    expect(rules?.content).toContain('bottom with LIST layout');
    expect(rules?.content).toContain('Always hide axis titles');
    expect(rules?.content).toContain('ALWAYS prefer gradient area fills over solid');
    expect(rules?.content).toContain('XY charts');
    expect(rules?.content).toContain('always `w: 24`');
    expect(rules?.content).not.toContain('styling.secondary.label');
    expect(rules?.content).not.toContain('areas.fill');
    expect(rules?.content).not.toContain('Gradient-filled areas are not available yet');
    expect(rules?.content).toContain('Do not remove visualization panels');
    expect(rules?.content).toContain(platformCoreTools.getIndexMapping);
    expect(rules?.content).toContain('error in the screenshot');
    expect(rules?.content).toContain('remove_controls');
    expect(rules?.content).toContain('missing from the mapping');
    expect(rules?.content).not.toContain('Do not remove controls');
    expect(rules?.content).toContain('Describe that wanted edition in `edit_panels.query`');
    expect(rules?.content).toContain('`add_section` without `panels`');
    expect(rules?.content).toContain('never copy existing panel configs into `add_section.panels`');
    expect(rules?.content).toContain(
      'If the edition does not need new columns, pass that query on `esql` unchanged'
    );
    expect(rules?.content).not.toContain('clear_metric_fill');
    expect(rules?.content).not.toContain('metric_trendline');
    expect(rules?.content).not.toContain('hide_title');
    expect(rules?.content).toContain(dashboardTools.generateDashboard);

    expect(skill.referencedContent?.some((ref) => ref.name === 'prettify-playbook')).toBe(false);

    const tools = await skill.getInlineTools?.();
    expect(tools?.map((tool) => tool.id)).toEqual([dashboardTools.generateDashboard]);
  });
});
