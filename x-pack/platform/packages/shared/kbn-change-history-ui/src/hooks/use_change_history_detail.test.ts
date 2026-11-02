/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useChangeHistoryDetail } from './use_change_history_detail';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import type { ChangeHistoryDetail } from '../types/change_history_detail';
import type { ChangeHistoryPendingChange } from '../types/change_history_pending_change';
import { TEST_SNAPSHOT } from '../test_utils/change_history_test_fixtures';
import { createChangeHistoryHookWrapper } from '../test_utils/create_change_history_hook_wrapper';

describe('useChangeHistoryDetail', () => {
  it('does not show loading for synchronously resolved cache hits', async () => {
    const detail: ChangeHistoryDetail = {
      id: 'evt-1',
      timestamp: '2026-01-01T00:00:00Z',
      actor: { name: 'Alice' },
      action: 'Updated',
      snapshot: TEST_SNAPSHOT,
    };

    const adapter: ChangeHistoryAdapter = {
      listChanges: jest.fn(),
      getChange: jest.fn().mockReturnValue(Promise.resolve(detail)),
    };

    const { wrapper } = createChangeHistoryHookWrapper({ adapter });

    const { result } = renderHook(
      () =>
        useChangeHistoryDetail({
          adapter,
          objectId: 'obj-1',
          changeId: 'evt-1',
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.change).toEqual(detail);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('does not clear the loaded change when fetching is temporarily disabled', async () => {
    const detail: ChangeHistoryDetail = {
      id: 'evt-1',
      timestamp: '2026-01-01T00:00:00Z',
      actor: { name: 'Alice' },
      action: 'Updated',
      snapshot: TEST_SNAPSHOT,
    };

    const adapter: ChangeHistoryAdapter = {
      listChanges: jest.fn(),
      getChange: jest.fn().mockReturnValue(Promise.resolve(detail)),
    };

    const { wrapper } = createChangeHistoryHookWrapper({ adapter });

    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useChangeHistoryDetail({
          adapter,
          objectId: 'obj-1',
          changeId: 'evt-1',
          enabled,
        }),
      { initialProps: { enabled: true }, wrapper }
    );

    await waitFor(() => {
      expect(result.current.change).toEqual(detail);
    });

    rerender({ enabled: false });

    expect(result.current.change).toEqual(detail);
    expect(adapter.getChange).toHaveBeenCalledTimes(1);
  });

  it('resolves pending selection locally without calling getChange', async () => {
    const pendingChange: ChangeHistoryPendingChange = {
      id: '__pending__',
      timestamp: '2026-07-03T12:00:00.000Z',
      actor: { name: 'You' },
      action: 'Unsaved changes',
      snapshot: { content: 'draft' },
    };

    const committedDetail: ChangeHistoryDetail = {
      id: 'evt-current',
      timestamp: '2026-06-16T12:00:00.000Z',
      actor: { name: 'Alice' },
      action: 'Updated',
      snapshot: TEST_SNAPSHOT,
      metadata: { version: 3 },
    };

    const getChange = jest.fn().mockResolvedValue(committedDetail);

    const adapter: ChangeHistoryAdapter = {
      listChanges: jest.fn(),
      getChange,
      getPendingChange: () => pendingChange,
    };

    const { wrapper } = createChangeHistoryHookWrapper({
      adapter,
      features: { unsavedChanges: true },
    });

    const { result, rerender } = renderHook(
      ({ changeId }) =>
        useChangeHistoryDetail({
          adapter,
          objectId: 'obj-1',
          changeId,
        }),
      { initialProps: { changeId: '__pending__' as string }, wrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.change).toMatchObject({
      id: '__pending__',
      snapshot: { content: 'draft' },
      isCurrent: true,
    });
    expect(getChange).not.toHaveBeenCalled();

    rerender({ changeId: 'evt-current' });

    await waitFor(() => {
      expect(result.current.change).toEqual(committedDetail);
    });

    expect(getChange).toHaveBeenCalledTimes(1);
  });
});
