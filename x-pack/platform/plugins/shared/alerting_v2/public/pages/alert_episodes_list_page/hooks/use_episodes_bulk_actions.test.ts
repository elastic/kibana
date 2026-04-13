/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { useBulkCreateAlertActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_bulk_create_alert_actions';
import { useEpisodesBulkActions } from './use_episodes_bulk_actions';

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_bulk_create_alert_actions');
const mockUseBulkCreate = jest.mocked(useBulkCreateAlertActions);

const mockMutate = jest.fn();
mockUseBulkCreate.mockReturnValue({ mutate: mockMutate } as unknown as ReturnType<
  typeof useBulkCreateAlertActions
>);

const mockHttp = httpServiceMock.createStartContract();
const mockToasts = {
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
  addDanger: jest.fn(),
};
const mockRefetch = jest.fn();

const ep = (id: string, groupHash: string): AlertEpisode =>
  ({ 'episode.id': id, group_hash: groupHash } as AlertEpisode);

const episodesData = [ep('ep1', 'gh1'), ep('ep2', 'gh2'), ep('ep3', 'gh1')];

const defaultParams = {
  episodesData,
  http: mockHttp,
  toastNotifications: mockToasts as never,
  refetch: mockRefetch,
};

beforeEach(() => jest.clearAllMocks());

describe('useEpisodesBulkActions', () => {
  it('returns 7 customBulkActions', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    expect(result.current.customBulkActions).toHaveLength(7);
  });

  it('pendingBulkState starts as null', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    expect(result.current.pendingBulkState).toBeNull();
  });

  it('tableKey starts at 0', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    expect(result.current.tableKey).toBe(0);
  });

  it('snooze action sets pendingBulkState with action=snooze', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    const snooze = result.current.customBulkActions.find((a) => a.key === 'snooze')!;

    act(() => {
      snooze.onClick({ selectedDocIds: ['0', '1'] });
    });

    expect(result.current.pendingBulkState).toEqual({
      action: 'snooze',
      selectedDocIds: ['0', '1'],
    });
  });

  it('edit-tags action sets pendingBulkState with action=tag', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    const editTags = result.current.customBulkActions.find((a) => a.key === 'edit-tags')!;

    act(() => {
      editTags.onClick({ selectedDocIds: ['0'] });
    });

    expect(result.current.pendingBulkState).toEqual({
      action: 'tag',
      selectedDocIds: ['0'],
    });
  });

  it('onPendingBulkClose resets pendingBulkState to null', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    const snooze = result.current.customBulkActions.find((a) => a.key === 'snooze')!;

    act(() => snooze.onClick({ selectedDocIds: ['0'] }));
    expect(result.current.pendingBulkState).not.toBeNull();

    act(() => result.current.onPendingBulkClose());
    expect(result.current.pendingBulkState).toBeNull();
  });

  it('acknowledge calls mutate with ACK items for selected episodes', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    const ack = result.current.customBulkActions.find((a) => a.key === 'acknowledge')!;

    act(() => ack.onClick({ selectedDocIds: ['0', '1'] }));

    expect(mockMutate).toHaveBeenCalledWith(
      [
        { group_hash: 'gh1', action_type: ALERT_EPISODE_ACTION_TYPE.ACK, episode_id: 'ep1' },
        { group_hash: 'gh2', action_type: ALERT_EPISODE_ACTION_TYPE.ACK, episode_id: 'ep2' },
      ],
      expect.any(Object)
    );
  });

  it('unsnooze deduplicates by group_hash', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    const unsnooze = result.current.customBulkActions.find((a) => a.key === 'unsnooze')!;

    // rows 0 and 2 share group_hash 'gh1'
    act(() => unsnooze.onClick({ selectedDocIds: ['0', '1', '2'] }));

    expect(mockMutate).toHaveBeenCalledWith(
      [
        { group_hash: 'gh1', action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE },
        { group_hash: 'gh2', action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE },
      ],
      expect.any(Object)
    );
  });

  it('onApplyBulkSnooze calls mutate with snooze items from pendingBulkState', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    const snooze = result.current.customBulkActions.find((a) => a.key === 'snooze')!;

    act(() => snooze.onClick({ selectedDocIds: ['0'] }));
    act(() => result.current.onApplyBulkSnooze('2026-05-01T00:00:00.000Z'));

    expect(mockMutate).toHaveBeenCalledWith(
      [
        {
          group_hash: 'gh1',
          action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
          expiry: '2026-05-01T00:00:00.000Z',
        },
      ],
      expect.any(Object)
    );
  });

  it('onBulkSuccess increments tableKey and calls refetch', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    const unsnooze = result.current.customBulkActions.find((a) => a.key === 'unsnooze')!;

    act(() => unsnooze.onClick({ selectedDocIds: ['0'] }));

    const [, { onSuccess }] = mockMutate.mock.calls[0];
    act(() => onSuccess({ processed: 1, total: 1 }));

    expect(result.current.tableKey).toBe(1);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('onBulkSuccess shows a success toast when all episodes are processed', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    const unsnooze = result.current.customBulkActions.find((a) => a.key === 'unsnooze')!;

    act(() => unsnooze.onClick({ selectedDocIds: ['0'] }));

    const [, { onSuccess }] = mockMutate.mock.calls[0];
    act(() => onSuccess({ processed: 1, total: 1 }));

    expect(mockToasts.addSuccess).toHaveBeenCalled();
    expect(mockToasts.addWarning).not.toHaveBeenCalled();
  });

  it('onBulkSuccess shows a warning toast when only some episodes are processed', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    const unsnooze = result.current.customBulkActions.find((a) => a.key === 'unsnooze')!;

    act(() => unsnooze.onClick({ selectedDocIds: ['0'] }));

    const [, { onSuccess }] = mockMutate.mock.calls[0];
    act(() => onSuccess({ processed: 1, total: 3 }));

    expect(mockToasts.addWarning).toHaveBeenCalled();
    expect(mockToasts.addSuccess).not.toHaveBeenCalled();
  });

  it('onBulkError shows a danger toast', () => {
    const { result } = renderHook(() => useEpisodesBulkActions(defaultParams));
    const unsnooze = result.current.customBulkActions.find((a) => a.key === 'unsnooze')!;

    act(() => unsnooze.onClick({ selectedDocIds: ['0'] }));

    const [, { onError }] = mockMutate.mock.calls[0];
    act(() => onError());

    expect(mockToasts.addDanger).toHaveBeenCalled();
  });
});
