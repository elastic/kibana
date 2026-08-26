/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  extractVisualizationEsql,
  extractVisualizations,
  getToolIds,
} from './extract_visualization';

const createVisualizationStep = (results: unknown[]) => ({
  type: 'tool_call',
  tool_id: platformCoreTools.createVisualization,
  results,
});

const visualizationResult = (data: Record<string, unknown>) => ({
  type: 'visualization',
  data,
});

describe('extractVisualizations', () => {
  it('collects esql, chart type, renderer, and config from each visualization', () => {
    const output = {
      steps: [
        createVisualizationStep([
          visualizationResult({
            esql: 'FROM a | STATS c = COUNT(*)',
            chart_type: 'metric',
            renderer: 'lens',
            visualization: { type: 'metric', dataset: { esql: 'FROM a | STATS c = COUNT(*)' } },
            attachment_id: 'viz-1',
          }),
        ]),
      ],
    };

    expect(extractVisualizations(output)).toEqual([
      {
        esql: 'FROM a | STATS c = COUNT(*)',
        chartType: 'metric',
        renderer: 'lens',
        visualization: { type: 'metric', dataset: { esql: 'FROM a | STATS c = COUNT(*)' } },
        attachmentId: 'viz-1',
      },
    ]);
  });

  it('keeps Vega visualizations that omit chart_type', () => {
    const output = {
      steps: [
        createVisualizationStep([
          visualizationResult({
            esql: 'FROM b | STATS c = COUNT(*) BY host',
            renderer: 'vega',
            visualization: { spec: '{"mark":"bar"}' },
          }),
        ]),
      ],
    };

    expect(extractVisualizations(output)).toEqual([
      {
        esql: 'FROM b | STATS c = COUNT(*) BY host',
        renderer: 'vega',
        visualization: { spec: '{"mark":"bar"}' },
      },
    ]);
  });

  it('drops visualizations without a usable ES|QL string', () => {
    const output = {
      steps: [
        createVisualizationStep([
          visualizationResult({ esql: '   ', chart_type: 'xy' }),
          visualizationResult({ renderer: 'vega' }),
          visualizationResult({ esql: 'FROM c | LIMIT 1', chart_type: 'xy' }),
        ]),
      ],
    };

    expect(extractVisualizations(output)).toEqual([{ esql: 'FROM c | LIMIT 1', chartType: 'xy' }]);
  });
});

describe('extractVisualizationEsql', () => {
  it('collects non-empty ES|QL from every generated visualization in order', () => {
    const output = {
      steps: [
        createVisualizationStep([visualizationResult({ esql: 'FROM a | LIMIT 1' })]),
        createVisualizationStep([visualizationResult({ esql: 'FROM b | LIMIT 1' })]),
      ],
    };

    expect(extractVisualizationEsql(output)).toEqual(['FROM a | LIMIT 1', 'FROM b | LIMIT 1']);
  });

  it('ignores error results and non-visualization tool calls', () => {
    const output = {
      steps: [
        { type: 'tool_call', tool_id: 'platform.core.execute_esql', results: [{ type: 'query' }] },
        createVisualizationStep([{ type: 'error', data: { message: 'boom' } }]),
      ],
    };

    expect(extractVisualizationEsql(output)).toEqual([]);
  });

  it('returns an empty array when there are no steps', () => {
    expect(extractVisualizationEsql({})).toEqual([]);
    expect(extractVisualizationEsql({ steps: [] })).toEqual([]);
  });
});

describe('getToolIds', () => {
  it('returns tool ids for tool_call steps in order', () => {
    const output = {
      steps: [
        { type: 'tool_call', tool_id: 'load_skill' },
        { type: 'reasoning' },
        { type: 'tool_call', tool_id: platformCoreTools.createVisualization },
      ],
    };

    expect(getToolIds(output)).toEqual(['load_skill', platformCoreTools.createVisualization]);
  });
});
