/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useChangeHistoryList } from './use_change_history_list';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';

describe('useChangeHistoryList', () => {
  it('loads paginated changes and appends on loadMore', async () => {
    const listChanges = jest
      .fn()
      .mockResolvedValueOnce({
        items: [
          { id: 'evt-1', timestamp: '2026-01-01T00:00:00Z', actor: { name: 'a' }, action: 'x' },
        ],
        total: 2,
      })
      .mockResolvedValueOnce({
        items: [
          { id: 'evt-2', timestamp: '2026-01-02T00:00:00Z', actor: { name: 'b' }, action: 'y' },
        ],
        total: 2,
      });

    const adapter: ChangeHistoryAdapter = {
      listChanges,
      getChange: jest.fn(),
    };

    const { result } = renderHook(() =>
      useChangeHistoryList({
        adapter,
        objectId: 'obj-1',
        pageSize: 1,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);

    result.current.loadMore();

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    expect(listChanges).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        objectId: 'obj-1',
        page: { index: 0, size: 1 },
      })
    );
    expect(listChanges).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        objectId: 'obj-1',
        page: { index: 1, size: 1 },
      })
    );
  });
});
