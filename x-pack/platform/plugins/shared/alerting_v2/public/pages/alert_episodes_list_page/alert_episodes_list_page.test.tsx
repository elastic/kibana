/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AlertEpisodesListPage } from './alert_episodes_list_page';
import type { CustomBulkActions } from '@kbn/unified-data-table';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ALERT_API_PATH } from '@kbn/alerting-v2-constants';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { UnifiedDataTable } from '@kbn/unified-data-table';
import { fetchAlertingEpisodes } from '@kbn/alerting-v2-episodes-ui/apis/fetch_alerting_episodes';
import { fetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/apis/fetch_episode_actions';
import { fetchGroupActions } from '@kbn/alerting-v2-episodes-ui/apis/fetch_group_actions';
import { fetchAlertActionTagSuggestions } from '@kbn/alerting-v2-episodes-ui/apis/fetch_alert_action_tag_suggestions';
import { fetchEpisodeTagOptions } from '@kbn/alerting-v2-episodes-ui/apis/fetch_episode_tag_options';
import { useAlertingEpisodesDataView } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episodes_data_view';

jest.mock('@kbn/alerting-v2-episodes-ui/components/actions/bulk_snooze_modal', () => ({
  BulkSnoozeModal: jest.fn(({ onClose, onApplySnooze }) => (
    <div data-test-subj="bulkSnoozeModal">
      <button onClick={() => onApplySnooze('2026-04-13T00:00:00.000Z')}>Apply</button>
      <button onClick={onClose}>Close</button>
    </div>
  )),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/actions/bulk_tags_modal', () => ({
  BulkTagsModal: jest.fn(({ onSave, onClose }) => (
    <div data-test-subj="bulkTagsModal">
      <button onClick={() => onSave(['tag-a'])}>Save</button>
      <button onClick={onClose}>Close</button>
    </div>
  )),
}));

jest.mock('@kbn/unified-data-table', () => ({
  DataLoadingState: { loading: 'loading', loaded: 'loaded' },
  UnifiedDataTable: jest.fn(() => null),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/apis/fetch_alerting_episodes');
jest.mock('@kbn/alerting-v2-episodes-ui/apis/fetch_episode_actions');
jest.mock('@kbn/alerting-v2-episodes-ui/apis/fetch_group_actions');
jest.mock('@kbn/alerting-v2-episodes-ui/apis/fetch_alert_action_tag_suggestions');
jest.mock('@kbn/alerting-v2-episodes-ui/apis/fetch_episode_tag_options');

// useAlertingEpisodesDataView uses react-use/useAsync internally with getEsqlDataView,
// which requires heavy Kibana data-view infra. Mock the hook so useFetchAlertingEpisodesQuery
// gets a ready dataView without going through the full data-view construction path.
jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episodes_data_view');

jest.mock('../../hooks/use_breadcrumbs', () => ({ useBreadcrumbs: jest.fn() }));

jest.mock('react-use/lib/useObservable', () =>
  jest.fn().mockReturnValue({ from: 'now-24h', to: 'now' })
);

const mockHttp = httpServiceMock.createStartContract();

const mockToastNotifications = {
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
  addDanger: jest.fn(),
};

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
  toastNotifications: mockToastNotifications,
  uiActions: { getTriggerCompatibleActions: jest.fn().mockResolvedValue([]) },
  expressions: {},
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
jest.mocked(fetchEpisodeActions).mockResolvedValue([]);
jest.mocked(fetchGroupActions).mockResolvedValue([]);
jest.mocked(fetchAlertActionTagSuggestions).mockResolvedValue([]);
jest.mocked(fetchEpisodeTagOptions).mockResolvedValue([]);
mockHttp.get.mockResolvedValue({ items: [] });
mockHttp.post.mockResolvedValue({ processed: 1, total: 1 });

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

describe('AlertEpisodesListPage bulk actions', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    renderPage();
    // Wait for episodes to load so bulk action handlers have access to episode data
    await waitFor(() => {
      const lastCall = mockUnifiedDataTable.mock.calls.at(-1)?.[0];
      expect(lastCall?.rows?.length).toBeGreaterThan(0);
    });
  });

  it('passes 7 customBulkActions to UnifiedDataTable', () => {
    expect(getCapturedBulkActions()).toHaveLength(7);
  });

  it('acknowledge sends ack items for all selected episodes', async () => {
    const ack = getCapturedBulkActions().find((a) => a.key === 'acknowledge')!;
    act(() => {
      ack.onClick({ selectedDocIds: ['0', '1'] });
    });

    await waitFor(() => {
      expect(mockHttp.post).toHaveBeenCalledWith(`${ALERTING_V2_ALERT_API_PATH}/action/_bulk`, {
        body: JSON.stringify([
          { group_hash: 'gh1', action_type: ALERT_EPISODE_ACTION_TYPE.ACK, episode_id: 'ep1' },
          { group_hash: 'gh2', action_type: ALERT_EPISODE_ACTION_TYPE.ACK, episode_id: 'ep2' },
        ]),
      });
    });
  });

  it('unsnooze deduplicates by group_hash', async () => {
    const unsnooze = getCapturedBulkActions().find((a) => a.key === 'unsnooze')!;
    act(() => {
      // rows 0 and 2 share group_hash 'gh1'
      unsnooze.onClick({ selectedDocIds: ['0', '1', '2'] });
    });

    await waitFor(() => {
      expect(mockHttp.post).toHaveBeenCalledWith(`${ALERTING_V2_ALERT_API_PATH}/action/_bulk`, {
        body: JSON.stringify([
          { group_hash: 'gh1', action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE },
          { group_hash: 'gh2', action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE },
        ]),
      });
    });
  });

  it('snooze sets pendingBulkAction — renders BulkSnoozeModal', () => {
    const snooze = getCapturedBulkActions().find((a) => a.key === 'snooze')!;
    act(() => {
      snooze.onClick({ selectedDocIds: ['0'] });
    });
    expect(screen.getByTestId('bulkSnoozeModal')).toBeInTheDocument();
  });

  it('edit-tags sets pendingBulkAction — renders BulkTagsModal', () => {
    const editTags = getCapturedBulkActions().find((a) => a.key === 'edit-tags')!;
    act(() => {
      editTags.onClick({ selectedDocIds: ['0'] });
    });
    expect(screen.getByTestId('bulkTagsModal')).toBeInTheDocument();
  });

  it('shows success toast when all episodes are updated', async () => {
    const unsnooze = getCapturedBulkActions().find((a) => a.key === 'unsnooze')!;
    act(() => {
      unsnooze.onClick({ selectedDocIds: ['0'] });
    });

    await waitFor(() => expect(mockToastNotifications.addSuccess).toHaveBeenCalled());
    expect(mockToastNotifications.addWarning).not.toHaveBeenCalled();
  });

  it('shows warning toast when only some episodes are updated', async () => {
    mockHttp.post.mockResolvedValueOnce({ processed: 1, total: 3 });
    const unsnooze = getCapturedBulkActions().find((a) => a.key === 'unsnooze')!;
    act(() => {
      unsnooze.onClick({ selectedDocIds: ['0'] });
    });

    await waitFor(() => expect(mockToastNotifications.addWarning).toHaveBeenCalled());
    expect(mockToastNotifications.addSuccess).not.toHaveBeenCalled();
  });

  it('shows error toast when the bulk mutation fails', async () => {
    mockHttp.post.mockRejectedValueOnce(new Error('API error'));
    const unsnooze = getCapturedBulkActions().find((a) => a.key === 'unsnooze')!;
    act(() => {
      unsnooze.onClick({ selectedDocIds: ['0'] });
    });

    await waitFor(() => expect(mockToastNotifications.addDanger).toHaveBeenCalled());
  });
});
