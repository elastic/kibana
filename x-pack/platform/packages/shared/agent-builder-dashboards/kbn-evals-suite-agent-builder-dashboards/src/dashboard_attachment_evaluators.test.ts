/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAgentTaskOutput } from './evaluate_dataset';
import {
  dashboardAttachmentExistsEvaluator,
  dashboardAttachmentTitleEvaluator,
  dashboardGridBoundsEvaluator,
  dashboardPanelCountEvaluator,
  dashboardSectionShapeEvaluator,
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

  it('evaluates attachment existence from dashboard attachment shape', async () => {
    const result = await dashboardAttachmentExistsEvaluator.evaluate({
      input: { question: 'question' },
      expected: {
        expectedDashboardAttachment: {
          exists: true,
        },
      },
      metadata: undefined,
      output: createOutput([
        {
          type: 'tool_call',
          tool_id: 'future.dashboard.tool',
          results: [createDashboardResult('dashboard', [])],
        },
      ]),
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(expect.objectContaining({ exists: true }));
  });

  it('evaluates non-empty dashboard titles', async () => {
    const result = await dashboardAttachmentTitleEvaluator.evaluate({
      input: { question: 'question' },
      expected: {
        expectedDashboardAttachment: {
          title: { nonEmpty: true },
        },
      },
      metadata: undefined,
      output: createOutput([
        {
          type: 'tool_call',
          tool_id: 'future.dashboard.tool',
          results: [createDashboardResult('Sample logs dashboard', [])],
        },
      ]),
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(expect.objectContaining({ title: 'Sample logs dashboard' }));
  });

  it('evaluates panel count ranges from dashboard attachment shape instead of tool id', async () => {
    const result = await dashboardPanelCountEvaluator.evaluate({
      input: { question: 'question' },
      expected: {
        expectedDashboardAttachment: {
          panelCount: { min: 2, max: 3 },
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

  it('evaluates section shape by title and panel count', async () => {
    const result = await dashboardSectionShapeEvaluator.evaluate({
      input: { question: 'question' },
      expected: {
        expectedDashboardAttachment: {
          sectionCount: 1,
          sections: [{ titleIncludes: ['overview'], minPanels: 2, maxPanels: 3 }],
        },
      },
      metadata: undefined,
      output: createOutput([
        {
          type: 'tool_call',
          tool_id: 'future.dashboard.tool',
          results: [
            createDashboardResult('dashboard', [
              {
                id: 'section-1',
                title: 'Overview metrics',
                panels: [{ id: 'panel-1' }, { id: 'panel-2' }],
              },
            ]),
          ],
        },
      ]),
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(
      expect.objectContaining({ sectionCount: 1, sectionFailures: [] })
    );
  });

  it('evaluates grid overflow across top-level and section panels', async () => {
    const result = await dashboardGridBoundsEvaluator.evaluate({
      input: { question: 'question' },
      expected: {
        expectedDashboardAttachment: {
          grid: { maxColumns: 48, noOverflow: true },
        },
      },
      metadata: undefined,
      output: createOutput([
        {
          type: 'tool_call',
          tool_id: 'future.dashboard.tool',
          results: [
            createDashboardResult('dashboard', [
              { id: 'panel-1', grid: { x: 0, y: 0, w: 24, h: 10 } },
              {
                id: 'section-1',
                panels: [{ id: 'panel-2', grid: { x: 24, y: 0, w: 24, h: 10 } }],
              },
            ]),
          ],
        },
      ]),
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(expect.objectContaining({ violations: [] }));
  });
});
