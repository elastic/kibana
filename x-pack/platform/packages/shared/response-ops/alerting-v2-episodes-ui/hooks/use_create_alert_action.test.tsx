/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ALERT_API_PATH } from '@kbn/alerting-v2-constants';
import { queryKeys } from '../query_keys';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useCreateAlertAction } from './use_create_alert_action';

const mockHttp = httpServiceMock.createStartContract();

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useCreateAlertAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('posts to the action route for the group hash and action type with an empty JSON body by default', async () => {
    mockHttp.post.mockResolvedValue({});

    const { result } = renderHook(() => useCreateAlertAction(mockHttp), {
      wrapper,
    });

    await result.current.mutateAsync({
      groupHash: 'group-hash-1',
      actionType: ALERT_EPISODE_ACTION_TYPE.ACK,
    });

    expect(mockHttp.post).toHaveBeenCalledWith(
      `${ALERTING_V2_ALERT_API_PATH}/group-hash-1/action/_ack`,
      { body: JSON.stringify({}) }
    );
  });

  it('stringifies a custom body when provided', async () => {
    mockHttp.post.mockResolvedValue({});

    const { result } = renderHook(() => useCreateAlertAction(mockHttp), {
      wrapper,
    });

    const body = { foo: 'bar', n: 1 };

    await result.current.mutateAsync({
      groupHash: 'gh',
      actionType: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
      body,
    });

    expect(mockHttp.post).toHaveBeenCalledWith(`${ALERTING_V2_ALERT_API_PATH}/gh/action/_snooze`, {
      body: JSON.stringify(body),
    });
  });

  it('invalidates episode and group action queries after a successful mutation', async () => {
    mockHttp.post.mockResolvedValue({});
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateAlertAction(mockHttp), {
      wrapper,
    });

    await result.current.mutateAsync({
      groupHash: 'gh',
      actionType: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
    });

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.actionsAll() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.groupActionsAll() });
  });

  it('does not invalidate queries when the request fails', async () => {
    mockHttp.post.mockRejectedValue(new Error('network error'));
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateAlertAction(mockHttp), {
      wrapper,
    });

    await expect(
      result.current.mutateAsync({
        groupHash: 'gh',
        actionType: ALERT_EPISODE_ACTION_TYPE.ACK,
      })
    ).rejects.toThrow('network error');

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
