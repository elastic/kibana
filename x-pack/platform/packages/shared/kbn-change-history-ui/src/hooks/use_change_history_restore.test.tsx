/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { ChangeHistoryProvider } from '../provider/change_history_provider';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import { useChangeHistoryRestore } from './use_change_history_restore';

const createAdapter = (
  restoreChange: ChangeHistoryAdapter['restoreChange']
): ChangeHistoryAdapter => ({
  listChanges: jest.fn(),
  getChange: jest.fn(),
  restoreChange,
});

const wrapper =
  (adapter: ChangeHistoryAdapter, features: { restore?: boolean } = { restore: true }) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ChangeHistoryProvider
        objectId="workflow-1"
        adapter={adapter}
        features={features}
        renderPreview={() => null}
      >
        {children}
      </ChangeHistoryProvider>
    );

describe('useChangeHistoryRestore', () => {
  it('calls adapter.restoreChange and forwards success to onRestoreSuccess', async () => {
    const restoreChange = jest.fn().mockResolvedValue(undefined);
    const onRestoreSuccess = jest.fn();
    const adapter = createAdapter(restoreChange);

    const { result } = renderHook(() => useChangeHistoryRestore(), {
      wrapper: ({ children }) => (
        <ChangeHistoryProvider
          objectId="workflow-1"
          adapter={adapter}
          features={{ restore: true }}
          onRestoreSuccess={onRestoreSuccess}
          renderPreview={() => null}
        >
          {children}
        </ChangeHistoryProvider>
      ),
    });

    await act(async () => {
      const succeeded = await result.current.restoreChange({
        objectId: 'workflow-1',
        changeId: 'evt-3',
      });
      expect(succeeded).toBe(true);
    });

    expect(restoreChange).toHaveBeenCalledWith({
      objectId: 'workflow-1',
      changeId: 'evt-3',
      signal: expect.any(AbortSignal),
    });
    expect(onRestoreSuccess).toHaveBeenCalledWith({
      objectId: 'workflow-1',
      changeId: 'evt-3',
    });
  });

  it('maps structured restore errors', async () => {
    const restoreChange = jest.fn().mockRejectedValue({
      body: {
        code: 'RESTORE_CONFLICT',
        message: 'Workflow was updated by another user.',
      },
    });
    const adapter = createAdapter(restoreChange);

    const { result } = renderHook(() => useChangeHistoryRestore(), {
      wrapper: wrapper(adapter),
    });

    await act(async () => {
      const succeeded = await result.current.restoreChange({
        objectId: 'workflow-1',
        changeId: 'evt-3',
      });
      expect(succeeded).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.error).toEqual({
        code: 'RESTORE_CONFLICT',
        message: 'Workflow was updated by another user.',
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
        objectId: 'workflow-1',
        changeId: 'evt-3',
      });
      expect(succeeded).toBe(false);
    });

    expect(restoreChange).not.toHaveBeenCalled();
    expect(result.current.canRestore).toBe(false);
  });
});
