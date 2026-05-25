/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TraceWaterfall } from './trace_waterfall';
import type { TraceSpan } from './types';

const makeSpan = (overrides: Partial<TraceSpan> = {}): TraceSpan => ({
  span_id: `span-${Math.random().toString(36).slice(2, 8)}`,
  trace_id: 'trace-1',
  name: 'generic-span',
  start_time: '2025-06-01T00:00:00.000Z',
  duration_ms: 100,
  kind: 'INTERNAL',
  status: 'OK',
  ...overrides,
});

const llmSpan = (id = 'llm-1') =>
  makeSpan({ span_id: id, name: 'llm.chat', attributes: { 'gen_ai.system': 'openai' } });

const toolSpan = (id = 'tool-1') =>
  makeSpan({ span_id: id, name: 'tool.execute', attributes: { 'gen_ai.tool.name': 'search' } });

const searchSpan = (id = 'search-1') => makeSpan({ span_id: id, name: 'esql-retrieval' });

const httpSpan = (id = 'http-1') => makeSpan({ span_id: id, name: 'POST /api/data' });

const otherSpan = (id = 'other-1') => makeSpan({ span_id: id, name: 'internal-processing' });

const noiseSpan = (id = 'noise-1') => makeSpan({ span_id: id, name: 'security.authenticate' });

const LEGEND_TEST_ID = 'traceWaterfallLegend';

describe('TraceWaterfall – legend and noise switch visibility', () => {
  it('only shows legend items for categories present in visible spans', () => {
    const spans = [llmSpan(), toolSpan()];
    render(<TraceWaterfall spans={spans} traceId="t1" />);

    const legend = screen.getByTestId(LEGEND_TEST_ID);
    expect(within(legend).getByText('LLM')).toBeInTheDocument();
    expect(within(legend).getByText('Tool')).toBeInTheDocument();
    expect(within(legend).queryByText('Search')).not.toBeInTheDocument();
    expect(within(legend).queryByText('HTTP')).not.toBeInTheDocument();
    expect(within(legend).queryByText('Other')).not.toBeInTheDocument();
  });

  it('shows all legend items when all categories are present', () => {
    const spans = [llmSpan(), toolSpan(), searchSpan(), httpSpan(), otherSpan()];
    render(<TraceWaterfall spans={spans} traceId="t1" />);

    const legend = screen.getByTestId(LEGEND_TEST_ID);
    expect(within(legend).getByText('LLM')).toBeInTheDocument();
    expect(within(legend).getByText('Tool')).toBeInTheDocument();
    expect(within(legend).getByText('Search')).toBeInTheDocument();
    expect(within(legend).getByText('HTTP')).toBeInTheDocument();
    expect(within(legend).getByText('Other')).toBeInTheDocument();
  });

  it('hides "Hide noise" switch when there are no noise spans', () => {
    const spans = [llmSpan(), toolSpan()];
    render(<TraceWaterfall spans={spans} traceId="t1" />);

    expect(screen.queryByText('Hide noise')).not.toBeInTheDocument();
  });

  it('shows "Hide noise" switch when noise spans exist', () => {
    const spans = [llmSpan(), noiseSpan()];
    render(<TraceWaterfall spans={spans} traceId="t1" />);

    expect(screen.getByText('Hide noise')).toBeInTheDocument();
  });

  it('removes a legend category when it only existed in noise spans and noise is hidden', () => {
    const noiseLlm = makeSpan({
      span_id: 'noise-llm',
      name: 'security.authenticate',
      attributes: { 'gen_ai.system': 'openai' },
    });
    const spans = [toolSpan(), noiseLlm];

    render(<TraceWaterfall spans={spans} traceId="t1" hideNoiseDefault />);

    const legend = screen.getByTestId(LEGEND_TEST_ID);
    expect(within(legend).getByText('Tool')).toBeInTheDocument();
    expect(within(legend).queryByText('LLM')).not.toBeInTheDocument();
  });

  it('updates legend when toggling "Hide noise" off reveals new categories', () => {
    const noiseLlm = makeSpan({
      span_id: 'noise-llm',
      name: 'security.has_privileges',
      attributes: { 'gen_ai.system': 'openai' },
    });
    const spans = [toolSpan(), noiseLlm];
    render(<TraceWaterfall spans={spans} traceId="t1" hideNoiseDefault />);

    const legend = screen.getByTestId(LEGEND_TEST_ID);
    expect(within(legend).queryByText('LLM')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Hide noise'));

    expect(within(legend).getByText('LLM')).toBeInTheDocument();
    expect(within(legend).getByText('Tool')).toBeInTheDocument();
  });
});
