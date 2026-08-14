/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { useTraceSpans } from '@kbn/llm-trace-waterfall';
import { appPaths } from '../../utils/app_paths';
import { useTracingEnabled } from '../../hooks/use_tracing_enabled';
import { useTraceExists } from '../../hooks/use_trace_exists';
import { TraceViewer } from './trace_viewer';

const mockNavigate = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: { plugins: { data: { search: { search: jest.fn() } }, spaces: {} } },
  }),
}));
jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: () => ({
    navigateToAgentBuilderUrl: mockNavigate,
    createAgentBuilderUrl: (path: string) => `/app/agent_builder${path}`,
  }),
}));
jest.mock('../../hooks/use_space_id', () => ({ useSpaceId: () => 'default' }));
jest.mock('../../hooks/use_tracing_enabled', () => ({ useTracingEnabled: jest.fn() }));
jest.mock('../../hooks/use_trace_exists', () => ({ useTraceExists: jest.fn() }));
jest.mock('@kbn/llm-trace-waterfall', () => ({
  TraceWaterfall: () => <div data-test-subj="mockWaterfall" />,
  useTraceSpans: jest.fn(),
  createEsTraceFetcher: jest.fn(() => jest.fn()),
}));
jest.mock('./span_tree_view', () => ({
  SpanTreeView: () => <div data-test-subj="mockSpanTree" />,
}));
jest.mock('./debug_trace_button', () => ({ DebugTraceButton: () => <div /> }));
jest.mock('./recent_traces_list', () => ({
  RecentTracesList: () => <div data-test-subj="mockRecentList" />,
}));
jest.mock('./use_recent_traces', () => ({
  useRecentTraces: () => ({ traces: [], isLoading: false, error: null }),
}));

const mockUseTracingEnabled = jest.mocked(useTracingEnabled);
const mockUseTraceExists = jest.mocked(useTraceExists);
const mockUseTraceSpans = jest.mocked(useTraceSpans);

const renderViewer = (traceId?: string) =>
  render(
    <IntlProvider locale="en">
      <TraceViewer traceId={traceId} />
    </IntlProvider>
  );

describe('TraceViewer', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseTracingEnabled.mockReturnValue(true);
    mockUseTraceExists.mockReturnValue({ exists: true, isLoading: false });
    mockUseTraceSpans.mockReturnValue({ spans: [], durationMs: 0, isLoading: false, error: null });
  });

  it('warns when tracing is disabled', () => {
    mockUseTracingEnabled.mockReturnValue(false);
    renderViewer();
    expect(screen.getByTestId('agentBuilderTracingDisabledCallout')).toBeInTheDocument();
  });

  it('navigates to the trace detail route when the search form is submitted', () => {
    renderViewer();
    fireEvent.change(screen.getByTestId('agentBuilderTraceIdInput'), {
      target: { value: '  abc-123  ' },
    });
    fireEvent.click(screen.getByTestId('agentBuilderTraceIdSubmit'));
    expect(mockNavigate).toHaveBeenCalledWith(appPaths.manage.traceDetails({ traceId: 'abc-123' }));
  });

  it('shows the waterfall by default and switches to the tree view on toggle', () => {
    mockUseTraceSpans.mockReturnValue({
      spans: [
        {
          span_id: 's1',
          trace_id: 't1',
          name: 'invoke_agent',
          start_time: '2026-08-13T00:00:00.000Z',
          duration_ms: 5,
        },
      ],
      durationMs: 5,
      isLoading: false,
      error: null,
    });

    renderViewer('t1');

    expect(screen.getByTestId('mockWaterfall')).toBeInTheDocument();
    expect(screen.queryByTestId('mockSpanTree')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('agentBuilderTraceViewToggleTree'));

    expect(screen.getByTestId('mockSpanTree')).toBeInTheDocument();
    expect(screen.queryByTestId('mockWaterfall')).not.toBeInTheDocument();
  });

  it('shows a not-found state for a trace ID with no spans that does not exist', () => {
    mockUseTraceExists.mockReturnValue({ exists: false, isLoading: false });
    renderViewer('missing-trace');

    expect(screen.getByTestId('agentBuilderTraceNotFound')).toBeInTheDocument();
    expect(screen.getByText('Trace not found')).toBeInTheDocument();
    expect(screen.queryByTestId('mockWaterfall')).not.toBeInTheDocument();
  });
});
