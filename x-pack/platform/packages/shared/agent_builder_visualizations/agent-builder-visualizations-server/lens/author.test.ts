/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { author, enforceStyleBound, pruneJsonSchema } from './author';
import { chartTypeRegistry } from './chart_type_registry';

const QUERY = 'FROM logs-* | STATS count = COUNT(*)';

const validMetric = {
  type: 'metric',
  metrics: [{ type: 'primary', column: 'count' }],
  data_source: { type: 'esql', query: QUERY },
};

const asAuthoringResponse = (config: Record<string, unknown>, authoringNote = 'A metric.'): string =>
  `\`\`\`json\n${JSON.stringify({ authoring_note: authoringNote, config })}\n\`\`\``;

describe('pruneJsonSchema', () => {
  it('shrinks the xy registry schema from tens of kilobytes to a few thousand characters', () => {
    const raw = z.toJSONSchema(chartTypeRegistry[SupportedChartType.XY].schema);
    const pruned = pruneJsonSchema(raw);
    expect(JSON.stringify(raw).length).toBeGreaterThan(20000);
    expect(JSON.stringify(pruned).length).toBeLessThan(8000);
  });
});

describe('author', () => {
  const compiled = {
    type: 'xy',
    layers: [
      {
        type: 'line',
        x: { column: '@timestamp' },
        y: [{ column: 'count' }],
        data_source: { type: 'esql', query: QUERY },
      },
    ],
    legend: { visibility: 'auto', placement: 'outside', position: 'bottom' },
  };

  it('rejects a style result that changes a slot column or type', async () => {
    const invoke = jest.fn().mockResolvedValue(
      asAuthoringResponse({
        ...compiled,
        layers: [
          {
            type: 'line',
            x: { column: '@timestamp' },
            y: [{ column: 'other' }],
            data_source: { type: 'esql', query: QUERY },
          },
        ],
      })
    );

    await expect(
      author(
        {
          mode: 'style',
          chartType: SupportedChartType.XY,
          compiledConfig: compiled,
          styleRequest: 'move the legend',
        },
        invoke
      )
    ).resolves.toEqual({ error: 'Style output changed type, data_source, or bound columns.' });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('keeps styling-only changes and leaves slots, type, and data_source unchanged', async () => {
    const invoke = jest.fn().mockResolvedValue(
      asAuthoringResponse({
        ...compiled,
        legend: { visibility: 'auto', placement: 'outside', position: 'right' },
      })
    );

    const result = await author(
      {
        mode: 'style',
        chartType: SupportedChartType.XY,
        compiledConfig: compiled,
        styleRequest: 'put the legend on the right',
      },
      invoke
    );

    expect(result).toEqual({
      config: {
        ...compiled,
        legend: { visibility: 'auto', placement: 'outside', position: 'right' },
      },
      authoringNote: 'A metric.',
    });
  });

  it('stops after a second schema failure', async () => {
    const invoke = jest.fn().mockResolvedValue(asAuthoringResponse({ type: 'xy' }));

    const result = await author(
      {
        mode: 'style',
        chartType: SupportedChartType.XY,
        compiledConfig: compiled,
        styleRequest: 'make it blue',
      },
      invoke
    );

    expect('error' in result).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});

describe('enforceStyleBound', () => {
  it('rejects a type change', () => {
    expect(
      enforceStyleBound(validMetric, { ...validMetric, type: 'xy' })
    ).toEqual({ error: 'Style output changed type, data_source, or bound columns.' });
  });
});
