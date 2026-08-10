/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { extractVisualizationEsql, getToolIds } from './extract_visualization';

const createVisualizationStep = (results: unknown[]) => ({
  type: 'tool_call',
  tool_id: platformCoreTools.createVisualization,
  results,
});

const visualizationResult = (data: Record<string, unknown>) => ({
  type: 'visualization',
  data,
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

  it('drops visualizations without a usable ES|QL string', () => {
    const output = {
      steps: [
        createVisualizationStep([
          visualizationResult({ esql: '   ' }),
          visualizationResult({ renderer: 'vega' }),
          visualizationResult({ esql: 'FROM c | LIMIT 1' }),
        ]),
      ],
    };

    expect(extractVisualizationEsql(output)).toEqual(['FROM c | LIMIT 1']);
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
