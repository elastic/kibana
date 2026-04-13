/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { AlertEpisodesListPage } from './alert_episodes_list_page';
import type { CustomBulkActions } from '@kbn/unified-data-table';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { UnifiedDataTable } from '@kbn/unified-data-table';

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

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_alerting_episodes_query', () => ({
  useFetchAlertingEpisodesQuery: jest.fn().mockReturnValue({
    data: [
      { 'episode.id': 'ep1', 'rule.id': 'rule1', group_hash: 'gh1' },
      { 'episode.id': 'ep2', 'rule.id': 'rule2', group_hash: 'gh2' },
      { 'episode.id': 'ep3', 'rule.id': 'rule3', group_hash: 'gh1' }, // same group as ep1
    ],
    dataView: { timeFieldName: '@timestamp' },
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions', () => ({
  useFetchEpisodeActions: jest.fn().mockReturnValue({ data: new Map() }),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions', () => ({
  useFetchGroupActions: jest.fn().mockReturnValue({ data: new Map() }),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rules_cache', () => ({
  useAlertingRulesCache: jest.fn().mockReturnValue({ rulesCache: {}, loading: false }),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_alert_episode_tag_suggestions', () => ({
  useFetchAlertEpisodeTagSuggestions: jest.fn().mockReturnValue({ data: [], isLoading: false }),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_create_alert_action', () => ({
  useCreateAlertAction: jest.fn().mockReturnValue({ mutate: jest.fn(), isLoading: false }),
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({ useBreadcrumbs: jest.fn() }));

jest.mock('react-use/lib/useObservable', () =>
  jest.fn().mockReturnValue({ from: 'now-24h', to: 'now' })
);

const mockBulkMutate = jest.fn();
jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_bulk_create_alert_actions', () => ({
  useBulkCreateAlertActions: jest.fn().mockImplementation(() => ({ mutate: mockBulkMutate })),
}));

const mockUnifiedDataTable = jest.mocked(UnifiedDataTable);

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

const getCapturedBulkActions = (): CustomBulkActions => {
  const calls = mockUnifiedDataTable.mock.calls;
  const lastCall = calls[calls.length - 1][0];
  return lastCall.customBulkActions as CustomBulkActions;
};

describe('AlertEpisodesListPage bulk actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    render(<AlertEpisodesListPage />);
  });

  it('passes 7 customBulkActions to UnifiedDataTable', () => {
    expect(getCapturedBulkActions()).toHaveLength(7);
  });

  it('acknowledge sends ack items for all selected episodes', () => {
    const actions = getCapturedBulkActions();
    const ack = actions.find((a) => a.key === 'acknowledge')!;
    ack.onClick({ selectedDocIds: ['0', '1'] });

    expect(mockBulkMutate).toHaveBeenCalledWith(
      [
        { group_hash: 'gh1', action_type: ALERT_EPISODE_ACTION_TYPE.ACK, episode_id: 'ep1' },
        { group_hash: 'gh2', action_type: ALERT_EPISODE_ACTION_TYPE.ACK, episode_id: 'ep2' },
      ],
      expect.any(Object)
    );
  });

  it('unsnooze deduplicates by group_hash', () => {
    const actions = getCapturedBulkActions();
    const unsnooze = actions.find((a) => a.key === 'unsnooze')!;
    // rows 0 and 2 share group_hash 'gh1'
    unsnooze.onClick({ selectedDocIds: ['0', '1', '2'] });

    expect(mockBulkMutate).toHaveBeenCalledWith(
      [
        { group_hash: 'gh1', action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE },
        { group_hash: 'gh2', action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE },
      ],
      expect.any(Object)
    );
  });

  it('snooze sets pendingBulkAction — renders BulkSnoozeModal', () => {
    const actions = getCapturedBulkActions();
    const snooze = actions.find((a) => a.key === 'snooze')!;
    act(() => {
      snooze.onClick({ selectedDocIds: ['0'] });
    });
    expect(screen.getByTestId('bulkSnoozeModal')).toBeInTheDocument();
  });

  it('edit-tags sets pendingBulkAction — renders BulkTagsModal', () => {
    const actions = getCapturedBulkActions();
    const editTags = actions.find((a) => a.key === 'edit-tags')!;
    act(() => {
      editTags.onClick({ selectedDocIds: ['0'] });
    });
    expect(screen.getByTestId('bulkTagsModal')).toBeInTheDocument();
  });

  it('shows success toast when all episodes are updated', () => {
    const actions = getCapturedBulkActions();
    const unsnooze = actions.find((a) => a.key === 'unsnooze')!;
    unsnooze.onClick({ selectedDocIds: ['0'] });

    // Extract the onSuccess callback passed to bulkMutate
    const [, { onSuccess }] = mockBulkMutate.mock.calls[0];
    act(() => onSuccess({ processed: 1, total: 1 }));

    expect(mockToastNotifications.addSuccess).toHaveBeenCalled();
    expect(mockToastNotifications.addWarning).not.toHaveBeenCalled();
  });

  it('shows warning toast when only some episodes are updated', () => {
    const actions = getCapturedBulkActions();
    const unsnooze = actions.find((a) => a.key === 'unsnooze')!;
    unsnooze.onClick({ selectedDocIds: ['0'] });

    const [, { onSuccess }] = mockBulkMutate.mock.calls[0];
    act(() => onSuccess({ processed: 1, total: 3 }));

    expect(mockToastNotifications.addWarning).toHaveBeenCalled();
    expect(mockToastNotifications.addSuccess).not.toHaveBeenCalled();
  });

  it('shows error toast when the bulk mutation fails', () => {
    const actions = getCapturedBulkActions();
    const unsnooze = actions.find((a) => a.key === 'unsnooze')!;
    unsnooze.onClick({ selectedDocIds: ['0'] });

    const [, { onError }] = mockBulkMutate.mock.calls[0];
    act(() => onError());

    expect(mockToastNotifications.addDanger).toHaveBeenCalled();
  });
});
