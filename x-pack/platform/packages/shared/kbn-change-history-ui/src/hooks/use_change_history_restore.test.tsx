/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import React, { useLayoutEffect } from 'react';
import { ChangeHistoryProvider } from '../provider/change_history_provider';
import { useChangeHistoryInternalConfig } from '../provider/use_change_history_internal_config';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import { useChangeHistoryRestore } from './use_change_history_restore';
import { TEST_OBJECT_ID, TEST_OBJECT_TITLE } from '../test_utils/change_history_test_fixtures';

const createAdapter = (
  restoreChange: ChangeHistoryAdapter['restoreChange']
): ChangeHistoryAdapter => ({
  listChanges: jest.fn(),
  getChange: jest.fn(),
  restoreChange,
});

const ListRefetchRegistrar = ({
  refetch,
  children,
}: {
  refetch: jest.Mock;
  children: React.ReactNode;
}) => {
  const { registerListRefetch } = useChangeHistoryInternalConfig();

  useLayoutEffect(() => {
    registerListRefetch(refetch);
    return () => registerListRefetch(undefined);
  }, [refetch, registerListRefetch]);

  return <>{children}</>;
};

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

describe('useChangeHistoryRestore', () => {
  it('calls adapter.restoreChange and refetches the history list after success', async () => {
    const restoreChange = jest.fn().mockResolvedValue(undefined);
    const refetchList = jest.fn().mockResolvedValue(undefined);
    const adapter = createAdapter(restoreChange);

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
          <ListRefetchRegistrar refetch={refetchList}>{children}</ListRefetchRegistrar>
        </ChangeHistoryProvider>
      ),
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
    expect(refetchList).toHaveBeenCalled();
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
