/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAgentTaskOutput } from './types';
import { dashboardRoutingEvaluator } from './evaluators/dashboard_routing';
import {
  dashboardSkillActivatedEvaluator,
  dashboardSkillNotActivatedEvaluator,
  getSkillReadPaths,
  getToolIds,
  visualizationSkillWithoutDashboardEvaluator,
} from './skill_selection_evaluators';

const createOutput = (steps: DashboardAgentTaskOutput['steps']): DashboardAgentTaskOutput => ({
  errors: [],
  messages: [{ message: '' }],
  steps,
});

const evaluateOutput = async (
  evaluator: typeof dashboardSkillActivatedEvaluator,
  output: DashboardAgentTaskOutput
) =>
  evaluator.evaluate({
    input: { question: 'question' },
    expected: {},
    metadata: undefined,
    output,
  });

describe('skill selection evaluators', () => {
  it('extracts skill read paths and tool ids from tool call steps', () => {
    const output = createOutput([
      {
        type: 'tool_call',
        tool_id: 'filestore.read',
        params: { path: 'skills/platform/dashboard/dashboards' },
      },
      {
        type: 'tool_call',
        tool_id: 'read_file',
        params: { path: '/skills/platform/dashboard/dashboards/enhance.md' },
      },
      {
        type: 'tool_call',
        tool_id: 'platform.dashboard.generate_dashboard',
      },
    ]);

    expect(getSkillReadPaths(output)).toEqual([
      'skills/platform/dashboard/dashboards',
      '/skills/platform/dashboard/dashboards/enhance.md',
    ]);
    expect(getToolIds(output)).toEqual([
      'filestore.read',
      'read_file',
      'platform.dashboard.generate_dashboard',
    ]);
  });

  it('requires enhance examples to read the enhance file', async () => {
    const enhance = { mode: 'appearance' as const, asksMode: false, defects: [] };
    const skillOnly = createOutput([
      {
        type: 'tool_call',
        tool_id: 'read_file',
        params: { path: '/skills/platform/dashboard/dashboards/SKILL.md' },
      },
    ]);
    const withEnhanceFile = createOutput([
      {
        type: 'tool_call',
        tool_id: 'read_file',
        params: { path: '/skills/platform/dashboard/dashboards/enhance.md' },
      },
    ]);

    const missed = await dashboardRoutingEvaluator.evaluate({
      input: { question: 'Enhance this dashboard' },
      expected: { route: 'dashboard', enhance },
      metadata: undefined,
      output: skillOnly,
    });
    expect(missed.score).toBe(0);
    expect(missed.explanation).toContain('dashboards/enhance.md');

    const read = await dashboardRoutingEvaluator.evaluate({
      input: { question: 'Enhance this dashboard' },
      expected: { route: 'dashboard', enhance },
      metadata: undefined,
      output: withEnhanceFile,
    });
    expect(read.score).toBe(1);

    const creation = await dashboardRoutingEvaluator.evaluate({
      input: { question: 'Create a dashboard' },
      expected: { route: 'dashboard' },
      metadata: undefined,
      output: skillOnly,
    });
    expect(creation.score).toBe(1);
  });

  it('passes when dashboard skill is loaded for dashboard requests', async () => {
    const result = await evaluateOutput(
      dashboardSkillActivatedEvaluator,
      createOutput([
        {
          type: 'tool_call',
          tool_id: 'filestore.read',
          params: { path: 'skills/platform/dashboard/dashboards' },
        },
      ])
    );

    expect(result.score).toBe(1);
    expect(result.label).toBe('PASS');
  });

  it('passes when visualization skill loads without the dashboards skill', async () => {
    const result = await evaluateOutput(
      visualizationSkillWithoutDashboardEvaluator,
      createOutput([
        {
          type: 'tool_call',
          tool_id: 'filestore.read',
          params: { path: 'skills/platform/visualization/visualization-creation' },
        },
        {
          type: 'tool_call',
          tool_id: 'platform.core.create_visualization',
        },
      ])
    );

    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        visualizationSkillLoaded: true,
        dashboardSkillLoaded: false,
        dashboardToolCalled: false,
      })
    );
  });

  it('fails visualization routing when the dashboards skill is used', async () => {
    const result = await evaluateOutput(
      visualizationSkillWithoutDashboardEvaluator,
      createOutput([
        {
          type: 'tool_call',
          tool_id: 'filestore.read',
          params: { path: 'skills/platform/visualization/visualization-creation' },
        },
        {
          type: 'tool_call',
          tool_id: 'platform.dashboard.generate_dashboard',
        },
      ])
    );

    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(expect.objectContaining({ dashboardToolCalled: true }));
  });

  it('passes when the dashboards skill is not activated for data exploration', async () => {
    const result = await evaluateOutput(
      dashboardSkillNotActivatedEvaluator,
      createOutput([
        {
          type: 'tool_call',
          tool_id: 'platform.core.generate_esql',
        },
      ])
    );

    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        dashboardSkillLoaded: false,
        dashboardToolCalled: false,
      })
    );
  });
});
