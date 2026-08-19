/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { appPaths } from '../../utils/app_paths';
import { RecentTracesList } from './recent_traces_list';
import type { RecentTrace } from './use_recent_traces';

const mockNavigate = jest.fn();
const mockCreateUrl = jest.fn((path: string) => `/app/agent_builder${path}`);

jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: () => ({
    navigateToAgentBuilderUrl: mockNavigate,
    createAgentBuilderUrl: mockCreateUrl,
  }),
}));

const trace = (overrides: Partial<RecentTrace> & Pick<RecentTrace, 'traceId'>): RecentTrace => ({
  timestamp: '2026-08-13T00:00:00.000Z',
  rootSpanName: 'invoke_agent elastic-ai-agent',
  durationMs: 1500,
  ...overrides,
});

const renderList = (props: React.ComponentProps<typeof RecentTracesList>) =>
  render(
    <IntlProvider locale="en">
      <RecentTracesList {...props} />
    </IntlProvider>
  );

describe('RecentTracesList', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCreateUrl.mockClear();
  });

  it('renders a row per trace and formats duration', () => {
    renderList({
      isLoading: false,
      error: null,
      traces: [
        trace({ traceId: 'trace-1', durationMs: 1500 }),
        trace({ traceId: 'trace-2', durationMs: 800 }),
      ],
    });

    expect(screen.getByText('trace-1')).toBeInTheDocument();
    expect(screen.getByText('trace-2')).toBeInTheDocument();
    // 1500ms -> seconds, 800ms -> milliseconds.
    expect(screen.getByText('1.50s')).toBeInTheDocument();
    expect(screen.getByText('800ms')).toBeInTheDocument();
  });

  it('links each trace to its detail route and navigates on plain click', () => {
    renderList({
      isLoading: false,
      error: null,
      traces: [trace({ traceId: 'trace-1' })],
    });

    const link = screen.getByTestId('agentBuilderRecentTraceLink');
    expect(link).toHaveAttribute(
      'href',
      `/app/agent_builder${appPaths.manage.traceDetails({ traceId: 'trace-1' })}`
    );

    fireEvent.click(link);
    expect(mockNavigate).toHaveBeenCalledWith(appPaths.manage.traceDetails({ traceId: 'trace-1' }));
  });

  it('renders an error callout when loading fails', () => {
    renderList({ isLoading: false, error: new Error('index missing'), traces: [] });
    expect(screen.getByText('index missing')).toBeInTheDocument();
  });

  it('renders the empty state when there are no traces', () => {
    renderList({ isLoading: false, error: null, traces: [] });
    expect(screen.getByTestId('agentBuilderRecentTracesEmpty')).toBeInTheDocument();
  });
});
