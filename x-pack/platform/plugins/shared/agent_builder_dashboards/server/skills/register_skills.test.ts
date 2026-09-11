/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { dashboardTools } from '../../common';
import { createDashboardManagementSkill } from './dashboard_management_skill';
import { registerSkills } from './register_skills';

const deps = { getFilesStart: jest.fn() };
const skill = createDashboardManagementSkill(deps);

describe('registerSkills', () => {
  it('registers the dashboard management skill', async () => {
    const register = jest.fn();
    const agentBuilder = {
      skills: { register },
    } as unknown as AgentBuilderPluginSetup;

    registerSkills(agentBuilder, deps);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboard-management' }));
  });

  it('exposes the generation and review tools as inline skill tools', async () => {
    const tools = (await skill.getInlineTools?.()) ?? [];
    expect(tools.map((tool) => tool.id)).toEqual([
      dashboardTools.generateDashboard,
      dashboardTools.reviewDashboard,
    ]);
  });

  it('includes SML discovery instructions in the skill content', () => {
    expect(skill.content).toContain('platform.core.sml_search');
    expect(skill.content).toContain('platform.core.sml_attach');
  });

  it('inlines the dashboard design guidance directly in the skill body', () => {
    expect(skill.content).toContain('Dashboard Composition Guidelines');
    expect(skill.content).toContain('Grid sizes by chart type');
    expect(skill.content).toContain('Grid Packing Rules');
    expect(skill.content).toContain('show avg/min/max in the legend');
    expect(skill.content).toContain('at least one and at most two of those primary time-series XY');
  });

  it('inlines chart-type selection in the skill body so the dashboard agent sees it', () => {
    expect(skill.content).toContain('Chart Type Guidance');
    expect(skill.content).toContain('Available chart types');
    expect(skill.content).toContain('- region_map:');
    expect(skill.content).toContain(
      'provide a new `chartType` when the request changes the chart family'
    );
  });

  it('describes the Prettify review-and-apply workflow around the review tool', () => {
    expect(skill.content).toContain('Improving an Existing Dashboard (Prettify)');
    expect(skill.content).toContain(dashboardTools.reviewDashboard);
    expect(skill.content).toContain('Do not run it on a dashboard you have just generated');
    expect(skill.content).toContain('exactly once per Prettify request, before applying edits');
    expect(skill.content).toContain('Do not run another review after applying edits');
    expect(skill.content).not.toContain('Review again');
    expect(skill.content).toContain('userPreferences');
    expect(skill.content).toContain('omit it for plain prettify requests');
    expect(skill.content).toContain('Do not send your analysis, edit plan, or a dashboard summary');
    expect(skill.content).toContain('appearanceOnly: true');
    expect(skill.content).toContain('never claim the updated dashboard was visually verified');
  });

  it('assigns semantic correctness and layout to the main agent even with no review findings', () => {
    expect(skill.content).toContain('Before review, assess semantics and layout only');
    expect(skill.content).toContain('Do not inspect these settings against defaults yourself');
    expect(skill.content).toContain('or produce a separate presentation critique');
    expect(skill.content).toContain('Read the full dashboard attachment');
    expect(skill.content).toContain(
      'Check the dashboard title, description, and every panel title'
    );
    expect(skill.content).toContain('sample web-log queries with security-related titles');
    expect(skill.content).toContain(
      'you remain responsible for meaning and layout even if it returns no findings'
    );
    expect(skill.content).toContain(
      'plan sections, ordering, panel sizes, and packed grid coordinates'
    );
    expect(skill.content).toContain('Merge all changes for each panel into one edit instruction');
    expect(skill.content).not.toContain('new_sections');
    expect(skill.content).not.toContain('data_questions');
  });

  it('leaves chart-specific design details to the chart author and the review tool', () => {
    expect(skill.content).not.toContain('CHART DESIGN GUIDANCE');
    expect(skill.content).not.toContain('COLOR GUIDANCE');
    expect(skill.content).not.toContain('apply_color_to');
    expect(skill.content).not.toContain('CONFIGURATION RULES');
    expect(skill.referencedContent ?? []).not.toContainEqual(
      expect.objectContaining({ name: 'color-palettes' })
    );
  });

  it('requires preserving panel identities when prettifying and reorganizing sections', () => {
    expect(skill.content).toContain('Prettify is not permission to rebuild');
    expect(skill.content).toContain('even when every panel needs changes');
    expect(skill.content).toContain('Create new sections without inline panels');
    expect(skill.content).toContain('panelAction: "promote"');
    expect(skill.content).toContain('do not fall back to recreating it');
    expect(skill.content).not.toContain('Prefer `edit_panels`');
    expect(skill.content).not.toContain('prefer `edit_panels`');
  });
});
