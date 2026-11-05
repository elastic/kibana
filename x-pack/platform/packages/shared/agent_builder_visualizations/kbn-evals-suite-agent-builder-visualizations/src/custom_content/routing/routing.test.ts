/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRequestedPanelTypes } from './requested_panel_types';
import { createRoutingEvaluator } from './routing_evaluator';
import type { RoutingTaskOutput } from './types';

const call = (tool_id: string, params: Record<string, unknown>) => ({
  type: 'tool_call',
  tool_id,
  params,
});

describe('getRequestedPanelTypes', () => {
  it('reads the type of each generated dashboard panel', () => {
    expect(
      getRequestedPanelTypes([
        call('platform.dashboard.generate_dashboard', {
          panels: [
            { id: 'a', content: { type: 'custom_content', query: 'x', hasData: false } },
            { id: 'b', content: { type: 'vis', query: 'y' } },
            { id: 'c', content: { type: 'vega', query: 'z' } },
            { id: 'd', content: { type: 'markdown', config: {} } },
            { id: 'e', content: { type: 'attachment', attachment_id: 'viz-1' } },
          ],
        }),
      ])
    ).toEqual(['custom_content', 'vis', 'vega']);
  });

  it('reads the visualization target type', () => {
    expect(
      getRequestedPanelTypes([
        call('platform.core.create_visualization', { target: { type: 'custom_content' } }),
        call('platform.core.create_visualization', { target: { type: 'vega' } }),
        call('platform.core.create_visualization', { target: { type: 'metric' } }),
        call('platform.core.create_visualization', { target: { type: 'attachment' } }),
      ])
    ).toEqual(['custom_content', 'vega', 'vis']);
  });

  it('ignores other tools and steps without params', () => {
    expect(
      getRequestedPanelTypes([
        call('platform.core.get_index_mapping', { index: 'logs' }),
        { type: 'tool_call', tool_id: 'platform.dashboard.generate_dashboard' },
        { type: 'reasoning' },
      ])
    ).toEqual([]);
    expect(getRequestedPanelTypes(undefined)).toEqual([]);
  });
});

describe('Custom Content Routing', () => {
  const evaluator = createRoutingEvaluator();
  const run = (panelTypes: string[], panelType: 'custom_content' | 'vis') =>
    evaluator.evaluate({
      input: { question: 'q' },
      output: {
        panelTypes,
        toolIds: [],
        errors: [],
        messages: [],
        prompts: [],
      } as RoutingTaskOutput,
      expected: { panelType },
      metadata: {},
    });

  it('passes custom content when it is needed and a chart when a chart is enough', async () => {
    expect(await run(['custom_content'], 'custom_content')).toMatchObject({ score: 1 });
    expect(await run(['vis'], 'vis')).toMatchObject({ score: 1, label: 'chart' });
    expect(await run(['vega'], 'vis')).toMatchObject({ score: 1 });
  });

  it('fails a chart where an HTML layout is needed, and the reverse', async () => {
    expect(await run(['vis'], 'custom_content')).toMatchObject({ score: 0, label: 'chose-chart' });
    expect(await run(['custom_content'], 'vis')).toMatchObject({
      score: 0,
      label: 'chose-custom-content',
    });
  });

  it('fails a run that asked for no panel', async () => {
    expect(await run([], 'vis')).toMatchObject({ score: 0, label: 'no-panel' });
  });
});
