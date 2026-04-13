/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERTING_V2_ALERT_API_PATH } from '@kbn/alerting-v2-constants';
import type { BulkCreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { queryKeys } from '../query_keys';
import { useBulkCreateAlertActions } from './use_bulk_create_alert_actions';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';

const mockHttp = httpServiceMock.createStartContract();

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useBulkCreateAlertActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('posts to the bulk endpoint with the given items', async () => {
    mockHttp.post.mockResolvedValue({ processed: 2, total: 2 });
    const { result } = renderHook(() => useBulkCreateAlertActions(mockHttp), {
      wrapper,
    });

    const items: BulkCreateAlertActionBody = [
      { group_hash: 'hash1', action_type: ALERT_EPISODE_ACTION_TYPE.ACK, episode_id: 'ep1' },
      { group_hash: 'hash2', action_type: ALERT_EPISODE_ACTION_TYPE.ACK, episode_id: 'ep2' },
    ];

    await result.current.mutateAsync(items);

    expect(mockHttp.post).toHaveBeenCalledWith(`${ALERTING_V2_ALERT_API_PATH}/action/_bulk`, {
      body: JSON.stringify(items),
    });
  });

  it('returns processed and total from the response', async () => {
    mockHttp.post.mockResolvedValue({ processed: 1, total: 2 });
    const { result } = renderHook(() => useBulkCreateAlertActions(mockHttp), {
      wrapper,
    });

    const items: BulkCreateAlertActionBody = [
      { group_hash: 'hash1', action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE },
    ];

    const response = await result.current.mutateAsync(items);

    expect(response).toEqual({ processed: 1, total: 2 });
  });

  it('invalidates episode and group action queries after a successful mutation', async () => {
    mockHttp.post.mockResolvedValue({ processed: 1, total: 1 });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBulkCreateAlertActions(mockHttp), {
      wrapper,
    });

    const items: BulkCreateAlertActionBody = [
      { group_hash: 'hash1', action_type: ALERT_EPISODE_ACTION_TYPE.ACK, episode_id: 'ep1' },
    ];

    await result.current.mutateAsync(items);

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(3));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.actionsAll() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.groupActionsAll() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.alertActionTagSuggestions() });
  });
});
