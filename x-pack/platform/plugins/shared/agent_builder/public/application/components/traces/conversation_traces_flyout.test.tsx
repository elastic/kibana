/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of } from 'rxjs';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { ConversationTracesFlyout } from './conversation_traces_flyout';

const mockSearch = jest.fn(() =>
  of({ rawResponse: { hits: { hits: [] } } } as unknown as { rawResponse: unknown })
);

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      plugins: {
        data: { search: { search: mockSearch } },
        spaces: {},
      },
    },
  }),
}));

jest.mock('../../hooks/use_space_id', () => ({
  useSpaceId: () => 'default',
}));

jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: () => ({ navigateToAgentBuilderUrl: jest.fn() }),
}));

// The detail header renders <DebugTraceButton>, which reads these settings-backed hooks;
// enable both so the button (and its trace fetch) render in the detail view.
jest.mock('../../hooks/use_tracing_enabled', () => ({
  useTracingEnabled: () => true,
}));

jest.mock('../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: () => true,
}));

const makeRound = (overrides: Partial<ConversationRound>): ConversationRound =>
  ({
    id: overrides.id ?? 'round-id',
    status: 'completed',
    input: { message: overrides.input?.message ?? 'Hello' },
    steps: [],
    time_to_last_token: 0,
    model_usage: { connector_id: 'c', llm_calls: 0 },
    ...overrides,
  } as ConversationRound);

const wrap = ({ children }: PropsWithChildren) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <IntlProvider locale="en">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </IntlProvider>
  );
};

describe('ConversationTracesFlyout', () => {
  beforeEach(() => {
    mockSearch.mockClear();
  });

  it('lists only rounds that produced a trace_id, preserving turn numbering', () => {
    const rounds = [
      makeRound({ id: 'r1', trace_id: 'trace-1', input: { message: 'first message' } }),
      makeRound({ id: 'r2', input: { message: 'no trace here' } }),
      makeRound({ id: 'r3', trace_id: ['trace-3-a'], input: { message: 'third message' } }),
    ];

    render(<ConversationTracesFlyout rounds={rounds} onClose={jest.fn()} />, { wrapper: wrap });

    const items = screen.getAllByTestId('agentBuilderConversationTracesListItem');
    expect(items).toHaveLength(2);
    // Turn 1 for round-1, Turn 3 for round-3 (round-2 skipped, but numbering keeps original index).
    expect(screen.getByText(/Turn 1:/)).toBeInTheDocument();
    expect(screen.getByText(/Turn 3:/)).toBeInTheDocument();
    expect(screen.getByText('trace-1')).toBeInTheDocument();
    expect(screen.getByText('trace-3-a')).toBeInTheDocument();
  });

  it('shows an empty state when no round has a trace', () => {
    const rounds = [makeRound({ id: 'r1', input: { message: 'no trace' } })];
    render(<ConversationTracesFlyout rounds={rounds} onClose={jest.fn()} />, { wrapper: wrap });
    expect(screen.getByTestId('agentBuilderConversationTracesEmpty')).toBeInTheDocument();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('switches into detail view when a row is clicked and fires the trace fetch', () => {
    const rounds = [
      makeRound({ id: 'r1', trace_id: 'trace-1', input: { message: 'first message' } }),
    ];

    render(<ConversationTracesFlyout rounds={rounds} onClose={jest.fn()} />, { wrapper: wrap });

    fireEvent.click(screen.getByTestId('agentBuilderConversationTracesListItem'));

    expect(screen.getByTestId('agentBuilderConversationTracesBackButton')).toBeInTheDocument();
    // Waterfall triggers a search with the space-scoped index and correct trace_id term.
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          index: 'traces-agent_builder.otel-default',
          body: expect.objectContaining({
            query: { term: { trace_id: 'trace-1' } },
          }),
        }),
      })
    );

    fireEvent.click(screen.getByTestId('agentBuilderConversationTracesBackButton'));
    expect(
      screen.queryByTestId('agentBuilderConversationTracesBackButton')
    ).not.toBeInTheDocument();
  });
});
