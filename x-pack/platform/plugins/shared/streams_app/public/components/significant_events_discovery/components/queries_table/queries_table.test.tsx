/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { SignificantEventItem } from '../../../../hooks/use_fetch_discovery_queries';
import { QueriesTable } from './queries_table';

jest.mock('../../../spark_plot', () => ({
  SparkPlot: () => null,
}));

jest.mock('../../../streams_app_search_bar', () => ({
  StreamsAppSearchBar: () => null,
}));

jest.mock('./promote_action', () => ({
  PromoteAction: () => null,
}));

const mockUseFetchDiscoveryQueries = jest.fn();
jest.mock('../../../../hooks/use_fetch_discovery_queries', () => ({
  DISCOVERY_QUERIES_QUERY_KEY: ['discoveryQueries'],
  useFetchDiscoveryQueries: (...args: unknown[]) => mockUseFetchDiscoveryQueries(...args),
}));

const mockUseFetchDiscoveryQueriesOccurrences = jest.fn();
jest.mock('../../../../hooks/use_fetch_discovery_queries_occurrences', () => ({
  DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY: ['discoveryQueriesOccurrences'],
  useFetchDiscoveryQueriesOccurrences: (...args: unknown[]) =>
    mockUseFetchDiscoveryQueriesOccurrences(...args),
}));

jest.mock('../../hooks/use_fetch_streams', () => ({
  useFetchStreams: () => ({ data: { streams: [] }, isLoading: false, isError: false }),
}));

jest.mock('../../../../hooks/use_unbacked_queries_count', () => ({
  UNBACKED_QUERIES_COUNT_QUERY_KEY: ['unbackedQueriesCount'],
  useUnbackedQueriesCount: () => ({ count: 0 }),
}));

jest.mock('../../../../hooks/use_queries_api', () => ({
  useQueriesApi: () => ({ promoteAll: jest.fn() }),
}));

jest.mock('../../../../hooks/use_timefilter', () => ({
  useTimefilter: () => ({ timeState: { start: Date.now() - 60_000, end: Date.now() } }),
}));

const mockUrlStateStorage = {
  get: jest.fn(),
  set: jest.fn(),
};
jest.mock('../../../../util/kbn_url_state_context', () => ({
  useKbnUrlStateStorageFromRouterContext: () => mockUrlStateStorage,
}));

const mockHistory = {
  listen: jest.fn(),
};

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    appParams: { history: mockHistory },
    dependencies: {
      start: {
        unifiedSearch: {
          ui: {
            SearchBar: () => null,
          },
        },
        share: {
          url: {
            locators: {
              get: () => ({ navigate: jest.fn() }),
            },
          },
        },
      },
    },
    core: {
      notifications: { toasts: { addSuccess: jest.fn(), addError: jest.fn() } },
    },
  }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient();
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </I18nProvider>
  );
};

describe('QueriesTable URL-backed pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistory.listen.mockImplementation(() => () => {});

    const baseItem: SignificantEventItem = {
      query: { id: 'q-1', title: 'Query 1', query: 'test', severity_score: 10 } as any,
      stream_name: 'logs-test-default',
      occurrences: [{ x: Date.now(), y: 1 }],
      change_points: { type: {} } as any,
      rule_backed: false,
    };

    mockUseFetchDiscoveryQueries.mockReturnValue({
      data: { queries: [baseItem], page: 1, perPage: 10, total: 30 },
      isLoading: false,
      isError: false,
    });

    mockUseFetchDiscoveryQueriesOccurrences.mockReturnValue({
      data: { aggregated_occurrences: [], total_occurrences: 0 },
      isLoading: false,
      isError: false,
    });
  });

  it('initializes page/perPage from URL state', () => {
    mockUrlStateStorage.get.mockReturnValue({ page: 2, perPage: 25 });

    renderWithProviders(<QueriesTable />);

    expect(mockUseFetchDiscoveryQueries).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, perPage: 25, query: '' })
    );
  });

  it('writes updated pagination to URL on page change', async () => {
    mockUrlStateStorage.get.mockReturnValue(undefined);

    renderWithProviders(<QueriesTable />);

    const user = userEvent.setup();
    const nextPageButton = await screen.findByLabelText('Next page');
    await user.click(nextPageButton);

    expect(mockUrlStateStorage.set).toHaveBeenCalledWith(
      'streamsDiscoveryQueriesTable',
      { page: 2, perPage: 10 },
      { replace: false }
    );
  });

  it('updates pagination when navigating back/forward', async () => {
    let historyListener: (() => void) | undefined;
    mockHistory.listen.mockImplementation((listener: () => void) => {
      historyListener = listener;
      return () => {};
    });

    mockUrlStateStorage.get.mockReturnValue({ page: 1, perPage: 10 });

    renderWithProviders(<QueriesTable />);

    mockUrlStateStorage.get.mockReturnValue({ page: 3, perPage: 50 });
    await act(async () => {
      historyListener?.();
    });

    // When the URL changes, the component should re-read page/perPage and refetch.
    // Note: the table may later clamp the page index if it's out of bounds for `total`.
    expect(mockUseFetchDiscoveryQueries).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, perPage: 50 })
    );
  });
});
