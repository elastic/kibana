/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import React, { useLayoutEffect } from 'react';
import { ChangeHistoryProvider } from '../provider/change_history_provider';
import { useChangeHistoryState } from '../provider/use_change_history_state';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import { useChangeHistoryRestore } from './use_change_history_restore';
import { TEST_OBJECT_ID, TEST_OBJECT_TITLE } from '../test_utils/change_history_test_fixtures';

const createAdapter = (
  restoreChange: ChangeHistoryAdapter['restoreChange'],
  listChanges: ChangeHistoryAdapter['listChanges'] = jest
    .fn()
    .mockResolvedValue({ items: [], total: 0 })
): ChangeHistoryAdapter => ({
  listChanges,
  getChange: jest.fn(),
  restoreChange,
});

const wrapper =
  (
    adapter: ChangeHistoryAdapter,
    features: { restore?: boolean } = { restore: true },
    permissions: { canRestore?: boolean } = { canRestore: true }
  ) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ChangeHistoryProvider
        objectId={TEST_OBJECT_ID}
        adapter={adapter}
        features={features}
        permissions={permissions}
        labels={{ previewTitle: TEST_OBJECT_TITLE }}
        renderPreview={() => null}
      >
        {children}
      </ChangeHistoryProvider>
    );

const SelectionTracker = ({
  onChange,
}: {
  onChange: (selectedChangeId: string | undefined) => void;
}) => {
  const { selectedChangeId } = useChangeHistoryState();

  useLayoutEffect(() => {
    onChange(selectedChangeId);
  }, [onChange, selectedChangeId]);

  return null;
};

const SelectChangeOnMount = ({ changeId }: { changeId: string }) => {
  const { setSelectedChangeId } = useChangeHistoryState();

  useLayoutEffect(() => {
    setSelectedChangeId(changeId);
  }, [changeId, setSelectedChangeId]);

  return null;
};

describe('useChangeHistoryRestore', () => {
  it('calls adapter.restoreChange and refetches the history list after success', async () => {
    const restoreChange = jest.fn().mockResolvedValue(undefined);
    const listChanges = jest.fn().mockResolvedValue({ items: [], total: 0 });
    const adapter = createAdapter(restoreChange, listChanges);

    const { result } = renderHook(() => useChangeHistoryRestore(), {
      wrapper: wrapper(adapter),
    });

    await act(async () => {
      const succeeded = await result.current.restoreChange({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
      });
      expect(succeeded).toBe(true);
    });

    expect(restoreChange).toHaveBeenCalledWith({
      objectId: TEST_OBJECT_ID,
      changeId: 'evt-3',
      signal: expect.any(AbortSignal),
    });
    expect(listChanges).toHaveBeenCalledTimes(1);
  });

  it('selects the current change after a successful restore', async () => {
    const restoreChange = jest.fn().mockResolvedValue(undefined);
    const listChanges = jest.fn().mockResolvedValue({
      items: [
        {
          id: 'evt-9',
          timestamp: '2026-06-17T12:00:00.000Z',
          actor: { name: 'Alice' },
          action: 'Restored',
          isCurrent: true,
        },
      ],
      total: 1,
    });
    const adapter = createAdapter(restoreChange, listChanges);
    const selectedIds: Array<string | undefined> = [];

    const { result } = renderHook(() => useChangeHistoryRestore(), {
      wrapper: ({ children }) => (
        <ChangeHistoryProvider
          objectId={TEST_OBJECT_ID}
          adapter={adapter}
          features={{ restore: true }}
          permissions={{ canRestore: true }}
          labels={{ previewTitle: TEST_OBJECT_TITLE }}
          renderPreview={() => null}
        >
          <SelectionTracker onChange={(id) => selectedIds.push(id)} />
          {children}
        </ChangeHistoryProvider>
      ),
    });

    await act(async () => {
      await result.current.restoreChange({ objectId: TEST_OBJECT_ID, changeId: 'evt-3' });
    });

    await waitFor(() => {
      expect(selectedIds.at(-1)).toBe('evt-9');
    });
  });

  it('maps structured restore errors', async () => {
    const restoreChange = jest.fn().mockRejectedValue({
      body: {
        code: 'RESTORE_CONFLICT',
        message: 'Object was updated by another user.',
      },
    });
    const adapter = createAdapter(restoreChange);

    const { result } = renderHook(() => useChangeHistoryRestore(), {
      wrapper: wrapper(adapter),
    });

    await act(async () => {
      const succeeded = await result.current.restoreChange({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
      });
      expect(succeeded).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.error).toEqual({
        code: 'RESTORE_CONFLICT',
        message: 'Object was updated by another user.',
      });
    });
  });

  it('does not clear the selected change while restore is in flight', async () => {
    let resolveRestore: (() => void) | undefined;
    const restoreChange = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRestore = resolve;
        })
    );
    const adapter = createAdapter(restoreChange);
    const selectedIds: Array<string | undefined> = [];
    const trackSelection = jest.fn((selectedChangeId: string | undefined) => {
      selectedIds.push(selectedChangeId);
    });

    const { result } = renderHook(() => useChangeHistoryRestore(), {
      wrapper: ({ children }) => (
        <ChangeHistoryProvider
          objectId={TEST_OBJECT_ID}
          adapter={adapter}
          features={{ restore: true }}
          permissions={{ canRestore: true }}
          labels={{ previewTitle: TEST_OBJECT_TITLE }}
          renderPreview={() => null}
        >
          <SelectChangeOnMount changeId="evt-3" />
          <SelectionTracker onChange={trackSelection} />
          {children}
        </ChangeHistoryProvider>
      ),
    });

    await waitFor(() => {
      expect(selectedIds).toContain('evt-3');
    });

    let restorePromise: Promise<boolean> | undefined;
    await act(async () => {
      restorePromise = result.current.restoreChange({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
      });
    });

    await waitFor(() => {
      expect(restoreChange).toHaveBeenCalled();
    });
    expect(selectedIds.at(-1)).toBe('evt-3');

    await act(async () => {
      resolveRestore?.();
      await restorePromise;
    });
  });

  it('does not call restore when the feature is disabled', async () => {
    const restoreChange = jest.fn();
    const adapter = createAdapter(restoreChange);

    const { result } = renderHook(() => useChangeHistoryRestore(), {
      wrapper: wrapper(adapter, { restore: false }),
    });

    await act(async () => {
      const succeeded = await result.current.restoreChange({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
      });
      expect(succeeded).toBe(false);
    });

    expect(restoreChange).not.toHaveBeenCalled();
    expect(result.current.canRestore).toBe(false);
  });
});
