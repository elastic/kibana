/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { TraceSpan } from '@kbn/llm-trace-waterfall';
import { SpanTreeView } from './span_tree_view';

// Render a lightweight stand-in for the package's SpanDetail so we can assert selection
// without pulling in the full waterfall detail panel.
jest.mock('@kbn/llm-trace-waterfall', () => ({
  SpanDetail: ({ span }: { span: { name: string } }) => (
    <div data-test-subj="mockSpanDetail">{span.name}</div>
  ),
}));

const span = (overrides: Partial<TraceSpan> & Pick<TraceSpan, 'span_id'>): TraceSpan => ({
  trace_id: 'trace-1',
  name: overrides.span_id,
  start_time: '2026-08-13T00:00:00.000Z',
  duration_ms: 10,
  ...overrides,
});

const renderView = (props: React.ComponentProps<typeof SpanTreeView>) =>
  render(
    <IntlProvider locale="en">
      <SpanTreeView {...props} />
    </IntlProvider>
  );

describe('SpanTreeView', () => {
  it('renders a row per span and a span count', () => {
    renderView({
      spans: [
        span({ span_id: 'root', name: 'invoke_agent' }),
        span({ span_id: 'child', name: 'execute_tool', parent_span_id: 'root' }),
      ],
    });

    expect(screen.getAllByTestId('agentBuilderSpanTreeRow')).toHaveLength(2);
    expect(screen.getByText('2 spans')).toBeInTheDocument();
  });

  it('opens the SpanDetail panel for the clicked span', () => {
    renderView({
      spans: [
        span({ span_id: 'root', name: 'invoke_agent' }),
        span({ span_id: 'child', name: 'execute_tool', parent_span_id: 'root' }),
      ],
    });

    // Nothing selected yet -> placeholder message, no detail panel.
    expect(screen.getByText('Select a span to see its details.')).toBeInTheDocument();
    expect(screen.queryByTestId('mockSpanDetail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('execute_tool'));

    const detail = screen.getByTestId('mockSpanDetail');
    expect(detail).toHaveTextContent('execute_tool');
  });

  it('flags spans with an error status', () => {
    renderView({
      spans: [span({ span_id: 'boom', name: 'execute_tool', status: 'STATUS_CODE_ERROR' })],
    });

    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders the error state', () => {
    renderView({ spans: [], error: new Error('kaboom') });
    expect(screen.getByText('kaboom')).toBeInTheDocument();
  });

  it('renders the empty state when there are no spans', () => {
    renderView({ spans: [] });
    expect(screen.getByTestId('agentBuilderSpanTreeEmpty')).toBeInTheDocument();
  });
});
