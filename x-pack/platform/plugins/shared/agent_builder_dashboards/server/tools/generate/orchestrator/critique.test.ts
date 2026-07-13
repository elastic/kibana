/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { critiqueFindingSchema, runCritique, type CritiqueFinding } from './critique';

const grid = { x: 0, y: 0, w: 24, h: 10 };

const createModel = (findings: CritiqueFinding[]) => {
  const invoke = jest.fn().mockResolvedValue({ findings });
  const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
  const model = { chatModel: { withStructuredOutput } } as unknown as ScopedModel;

  return { invoke, model, withStructuredOutput };
};

const getMessages = (invoke: jest.Mock) =>
  invoke.mock.calls[0][0] as Array<{ role: string; content: string }>;

const countOccurrences = (text: string, value: string): number => text.split(value).length - 1;

describe('runCritique', () => {
  it('reviews the full dashboard with composition and deduplicated relevant chart guidance', async () => {
    const dashboard: DashboardAttachmentData = {
      title: 'Service health',
      description: 'Full payload marker',
      panels: [
        {
          id: 'metric-1',
          type: LENS_EMBEDDABLE_TYPE,
          grid,
          config: {
            type: 'metric',
            data_source: { type: 'esql', query: 'FROM logs-* | STATS count = COUNT(*)' },
          },
        },
        {
          id: 'metric-2',
          type: LENS_EMBEDDABLE_TYPE,
          grid: { ...grid, x: 24 },
          config: {
            type: 'metric',
            data_source: { type: 'esql', query: 'FROM logs-* | STATS errors = COUNT(*)' },
          },
        },
        {
          id: 'trends',
          title: 'Trends',
          collapsed: false,
          grid: { y: 10 },
          panels: [
            {
              id: 'xy-1',
              type: LENS_EMBEDDABLE_TYPE,
              grid,
              config: {
                type: 'xy',
                data_source: {
                  type: 'esql',
                  query: 'FROM logs-* | STATS count = COUNT(*) BY BUCKET(@timestamp, 1 hour)',
                },
              },
            },
            {
              id: 'vega-1',
              type: VEGA_VIS_TYPE,
              grid: { ...grid, x: 24 },
              config: {
                spec: JSON.stringify({
                  title: 'Latency by service',
                  data: { url: { '%type%': 'esql', query: 'FROM logs-*' } },
                }),
              },
            },
          ],
        },
      ],
    };
    const findings: CritiqueFinding[] = [
      {
        target: 'metric-1',
        category: 'presentation',
        issue: 'The metric repeats its label in a panel title.',
        suggestion: 'Hide the redundant title.',
        requiresDataChange: false,
      },
    ];
    const { invoke, model, withStructuredOutput } = createModel(findings);

    await expect(
      runCritique({ model, request: 'Prettify this dashboard', dashboard })
    ).resolves.toEqual(findings);

    expect(withStructuredOutput).toHaveBeenCalledWith(expect.anything(), {
      name: 'report_dashboard_critique',
    });
    const messages = getMessages(invoke);
    const systemPrompt = messages[0].content;
    const userPrompt = messages[1].content;

    expect(systemPrompt).toContain('Dashboard Composition Guidelines');
    expect(systemPrompt).toContain('48-column grid');
    expect(systemPrompt).toContain('Inspect the dashboard as a whole and inspect every panel');
    expect(systemPrompt).toContain('Existing working ES|QL queries should be preserved by default');
    expect(systemPrompt).toContain('requiresDataChange to true');
    expect(systemPrompt).toContain('adding, removing, or replacing panels');
    expect(systemPrompt).toContain('skip them without recommending modifications');
    expect(systemPrompt).toContain('Do NOT set axis titles');
    expect(systemPrompt).toContain('Do NOT hardcode colors');
    expect(countOccurrences(systemPrompt, '2) METRIC RULES')).toBe(1);
    expect(countOccurrences(systemPrompt, 'CHART-SPECIFIC RULES FOR XY:')).toBe(1);
    expect(countOccurrences(systemPrompt, 'Author Vega-Lite ONLY')).toBe(1);
    expect(systemPrompt).toContain('WHERE <time field> >= ?_tstart AND <time field> < ?_tend');
    expect(userPrompt).toContain('Prettify this dashboard');
    expect(userPrompt).toContain('Full payload marker');
    expect(userPrompt).toContain('FROM logs-* | STATS errors = COUNT(*)');
    expect(userPrompt).toContain('Latency by service');
  });

  it('omits Vega and unrelated chart guidance when those panel types are absent', async () => {
    const dashboard: DashboardAttachmentData = {
      title: 'Metrics',
      panels: [
        {
          id: 'metric-1',
          type: LENS_EMBEDDABLE_TYPE,
          grid,
          config: {
            type: 'metric',
            data_source: { type: 'esql', query: 'FROM logs-* | STATS count = COUNT(*)' },
          },
        },
      ],
    };
    const { invoke, model } = createModel([]);

    await runCritique({ model, request: 'Review it', dashboard });

    const systemPrompt = getMessages(invoke)[0].content;
    expect(systemPrompt).toContain('2) METRIC RULES');
    expect(systemPrompt).not.toContain('CHART-SPECIFIC RULES FOR XY:');
    expect(systemPrompt).not.toContain('Author Vega-Lite ONLY');
  });

  it('requires a supported category and an explicit data-change decision', () => {
    expect(() =>
      critiqueFindingSchema.parse({
        category: 'style',
        issue: 'Issue',
        suggestion: 'Suggestion',
        requiresDataChange: false,
      })
    ).toThrow();
    expect(() =>
      critiqueFindingSchema.parse({
        category: 'layout',
        issue: 'Issue',
        suggestion: 'Suggestion',
      })
    ).toThrow();
  });
});
