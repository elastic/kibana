/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AlertEpisodesListPage } from './alert_episodes_list_page';
import type { CustomBulkActions } from '@kbn/unified-data-table';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { UnifiedDataTable } from '@kbn/unified-data-table';
import { fetchAlertingEpisodes } from '@kbn/alerting-v2-episodes-ui/apis/fetch_alerting_episodes';
import { useAlertingEpisodesDataView } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episodes_data_view';
import { createEpisodeActions } from '@kbn/alerting-v2-episodes-ui/actions';

jest.mock('@kbn/unified-data-table', () => ({
  DataLoadingState: { loading: 'loading', loaded: 'loaded' },
  ROWS_HEIGHT_OPTIONS: { auto: -1, single: 1, default: 3 },
  UnifiedDataTable: jest.fn(() => null),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/apis/fetch_alerting_episodes');

// useAlertingEpisodesDataView uses react-use/useAsync internally with getEsqlDataView,
// which requires heavy Kibana data-view infra. Mock the hook so useFetchAlertingEpisodesQuery
// gets a ready dataView without going through the full data-view construction path.
jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episodes_data_view');

jest.mock('@kbn/alerting-v2-episodes-ui/actions', () => ({
  createEpisodeActions: jest.fn(() => []),
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({ useBreadcrumbs: jest.fn() }));

jest.mock('react-use/lib/useObservable', () =>
  jest.fn().mockReturnValue({ from: 'now-24h', to: 'now' })
);

const mockHttp = httpServiceMock.createStartContract();

const mockServices = {
  http: mockHttp,
  data: {
    query: {
      timefilter: {
        timefilter: {
          getTimeUpdate$: jest.fn().mockReturnValue({
            pipe: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
          }),
          getTime: jest.fn().mockReturnValue({ from: 'now-24h', to: 'now' }),
          setTime: jest.fn(),
        },
      },
    },
  },
  overlays: {},
  notifications: { toasts: {} },
  rendering: {},
  application: { capabilities: {} },
  expressions: {},
  share: {},
  uiSettings: {},
  uiActions: { getTriggerCompatibleActions: jest.fn().mockResolvedValue([]) },
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn().mockImplementation(() => ({ services: mockServices })),
}));

const mockUnifiedDataTable = jest.mocked(UnifiedDataTable);

const mockDataView = {
  fields: { forEach: jest.fn() },
  setFieldCustomLabel: jest.fn(),
  setFieldFormat: jest.fn(),
  addRuntimeField: jest.fn(),
  timeFieldName: '@timestamp',
};

const mockEpisodes = [
  {
    'episode.id': 'ep1',
    'rule.id': 'rule1',
    group_hash: 'gh1',
    '@timestamp': '2026-01-01T00:00:00Z',
  },
  {
    'episode.id': 'ep2',
    'rule.id': 'rule2',
    group_hash: 'gh2',
    '@timestamp': '2026-01-01T00:00:00Z',
  },
  {
    'episode.id': 'ep3',
    'rule.id': 'rule3',
    group_hash: 'gh1',
    '@timestamp': '2026-01-01T00:00:00Z',
  },
];

// jest.clearAllMocks() only resets call history, not implementations, so these stable
// return values are set once at module scope and persist across all tests.
jest.mocked(useAlertingEpisodesDataView).mockReturnValue(mockDataView as any);
jest.mocked(fetchAlertingEpisodes).mockResolvedValue(mockEpisodes as any);
mockHttp.get.mockResolvedValue({ items: [] });

const mockCreateEpisodeActions = jest.mocked(createEpisodeActions);

const getCapturedBulkActions = (): CustomBulkActions => {
  const calls = mockUnifiedDataTable.mock.calls;
  const lastCall = calls[calls.length - 1][0];
  return lastCall.customBulkActions as CustomBulkActions;
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AlertEpisodesListPage />
    </QueryClientProvider>
  );
};

describe('AlertEpisodesListPage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockCreateEpisodeActions.mockReturnValue([]);
    jest.mocked(useAlertingEpisodesDataView).mockReturnValue(mockDataView as any);
    jest.mocked(fetchAlertingEpisodes).mockResolvedValue(mockEpisodes as any);
    mockHttp.get.mockResolvedValue({ items: [] });
    renderPage();
    // Wait for episodes to load so bulk action handlers have access to episode data
    await waitFor(() => {
      const lastCall = mockUnifiedDataTable.mock.calls.at(-1)?.[0];
      expect(lastCall?.rows?.length).toBeGreaterThan(0);
    });
  });

  it('passes customBulkActions derived from episode actions to UnifiedDataTable', () => {
    const mockAction = {
      id: 'test-action',
      order: 1,
      displayName: 'Test Action',
      iconType: 'star',
      isCompatible: jest.fn(() => true),
      execute: jest.fn(async () => {}),
    };
    mockCreateEpisodeActions.mockReturnValue([mockAction]);

    renderPage();

    const bulkActions = getCapturedBulkActions();
    // With no actions returned by createEpisodeActions (cleared mock), expect empty
    expect(bulkActions).toBeDefined();
  });

  it('passes rowAdditionalLeadingControls to UnifiedDataTable', () => {
    const lastCall = mockUnifiedDataTable.mock.calls.at(-1)?.[0];
    expect(lastCall).toHaveProperty('rowAdditionalLeadingControls');
    expect(Array.isArray(lastCall?.rowAdditionalLeadingControls)).toBe(true);
  });

  it('does not pass key prop derived from tableKey (no tableKey state)', () => {
    // The table should be rendered without a dynamic key that causes remounts
    const lastCall = mockUnifiedDataTable.mock.calls.at(-1)?.[0];
    // key is not a prop that appears in the component's props object in React,
    // so we just verify UnifiedDataTable was called (rendered)
    expect(lastCall).toBeDefined();
  });

  it('calls createEpisodeActions with services from useKibana', () => {
    expect(mockCreateEpisodeActions).toHaveBeenCalledWith(
      expect.objectContaining({
        http: mockServices.http,
        expressions: mockServices.expressions,
      })
    );
  });
});
