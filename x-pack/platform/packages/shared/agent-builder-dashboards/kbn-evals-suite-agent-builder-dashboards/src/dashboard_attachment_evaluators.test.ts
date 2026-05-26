/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAgentTaskOutput } from './evaluate_dataset';
import {
  dashboardMinPanelCountEvaluator,
  getLatestDashboardAttachmentContent,
} from './dashboard_attachment_evaluators';

const createOutput = (steps: DashboardAgentTaskOutput['steps']): DashboardAgentTaskOutput => ({
  errors: [],
  messages: [{ message: '' }],
  steps,
});

const createDashboardResult = (title: string, panels: Array<Record<string, unknown>>) => ({
  type: 'dashboard',
  data: {
    dashboardAttachment: {
      content: {
        title,
        panels,
      },
    },
  },
});

describe('dashboard attachment evaluators', () => {
  it('extracts the latest dashboard attachment content regardless of tool id', () => {
    const output = createOutput([
      {
        type: 'tool_call',
        tool_id: 'future.dashboard.tool',
        results: [createDashboardResult('older dashboard', [{ id: 'panel-1' }])],
      },
      {
        type: 'tool_call',
        tool_id: 'another.future.dashboard.tool',
        results: [createDashboardResult('newer dashboard', [{ id: 'panel-2' }, { id: 'panel-3' }])],
      },
    ]);

    expect(getLatestDashboardAttachmentContent(output)).toEqual({
      title: 'newer dashboard',
      panels: [{ id: 'panel-2' }, { id: 'panel-3' }],
    });
  });

  it('evaluates panel counts from dashboard attachment shape instead of tool id', async () => {
    const result = await dashboardMinPanelCountEvaluator.evaluate({
      input: { question: 'question' },
      expected: {
        expectedDashboardAttachment: {
          panelCount: { min: 2 },
        },
      },
      metadata: undefined,
      output: createOutput([
        {
          type: 'tool_call',
          tool_id: 'future.dashboard.tool',
          results: [
            createDashboardResult('dashboard', [
              { id: 'panel-1' },
              {
                id: 'section-1',
                panels: [{ id: 'panel-2' }, { id: 'panel-3' }],
              },
            ]),
          ],
        },
      ]),
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(expect.objectContaining({ panelCount: 3 }));
  });
});
