/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRequestedRenderers } from './requested_renderers';
import { createRoutingEvaluator } from './routing_evaluator';
import type { RoutingTaskOutput } from './types';

const call = (tool_id: string, params: Record<string, unknown>) => ({
  type: 'tool_call',
  tool_id,
  params,
});

describe('getRequestedRenderers', () => {
  it('reads the renderer of each dashboard panel, Lens when it names none', () => {
    expect(
      getRequestedRenderers([
        call('platform.dashboard.generate_dashboard', {
          panels: [
            { id: 'a', content: { source: 'request', renderer: 'custom_content', query: 'x' } },
            { id: 'b', content: { source: 'request', query: 'y' } },
            { id: 'c', content: { source: 'config', type: 'markdown', config: {} } },
          ],
        }),
      ])
    ).toEqual(['custom_content', 'lens']);
  });

  it('reads the visualization target type', () => {
    expect(
      getRequestedRenderers([
        call('platform.core.create_visualization', { target: { type: 'custom_content' } }),
        call('platform.core.create_visualization', { target: { type: 'vega' } }),
        call('platform.core.create_visualization', { target: { type: 'metric' } }),
        call('platform.core.create_visualization', { target: { type: 'attachment' } }),
      ])
    ).toEqual(['custom_content', 'vega', 'lens']);
  });

  it('ignores other tools and steps without params', () => {
    expect(
      getRequestedRenderers([
        call('platform.core.get_index_mapping', { index: 'logs' }),
        { type: 'tool_call', tool_id: 'platform.dashboard.generate_dashboard' },
        { type: 'reasoning' },
      ])
    ).toEqual([]);
    expect(getRequestedRenderers(undefined)).toEqual([]);
  });
});

describe('Custom Content Routing', () => {
  const evaluator = createRoutingEvaluator();
  const run = (renderers: string[], renderer: 'custom_content' | 'lens') =>
    evaluator.evaluate({
      input: { question: 'q' },
      output: {
        renderers,
        toolIds: [],
        errors: [],
        messages: [],
        prompts: [],
      } as RoutingTaskOutput,
      expected: { renderer },
      metadata: {},
    });

  it('passes custom content when it is needed and a chart when a chart is enough', async () => {
    expect(await run(['custom_content'], 'custom_content')).toMatchObject({ score: 1 });
    expect(await run(['lens'], 'lens')).toMatchObject({ score: 1, label: 'chart' });
    expect(await run(['vega'], 'lens')).toMatchObject({ score: 1 });
  });

  it('fails a chart where an HTML layout is needed, and the reverse', async () => {
    expect(await run(['lens'], 'custom_content')).toMatchObject({ score: 0, label: 'chose-chart' });
    expect(await run(['custom_content'], 'lens')).toMatchObject({
      score: 0,
      label: 'chose-custom-content',
    });
  });

  it('fails a run that asked for no panel', async () => {
    expect(await run([], 'lens')).toMatchObject({ score: 0, label: 'no-panel' });
  });
});
