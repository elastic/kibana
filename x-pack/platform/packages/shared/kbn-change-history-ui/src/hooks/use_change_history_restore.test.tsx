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
import { useChangeHistoryList } from './use_change_history_list';
import { useChangeHistoryRestore } from './use_change_history_restore';
import { ChangeHistoryTelemetryEventTypes } from '../telemetry/types';
import {
  TEST_CHANGE_HISTORY_SCOPE,
  TEST_OBJECT_ID,
  TEST_OBJECT_TITLE,
} from '../test_utils/change_history_test_fixtures';
import { changeHistoryObjectQueryKeyPrefix } from './change_history_list_query_key';
import { createQueryClientWrapper } from '../test_utils/create_query_client_wrapper';

const testScope = {
  module: 'stack',
  dataset: 'workflows',
  objectType: 'workflow',
};

const createAdapter = (
  restoreChange: ChangeHistoryAdapter['restoreChange']
): ChangeHistoryAdapter => ({
  listChanges: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getChange: jest.fn(),
  restoreChange,
});

const createHarness = (
  adapter: ChangeHistoryAdapter,
  features: { restore?: boolean } = { restore: true },
  permissions: { canRestore?: boolean } = { canRestore: true },
  reportEvent?: jest.Mock,
  listPageSize?: number
) => {
  const { wrapper: QueryClientWrapper, queryClient } = createQueryClientWrapper();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientWrapper>
      <ChangeHistoryProvider
        objectId={TEST_OBJECT_ID}
        adapter={adapter}
        features={features}
        permissions={permissions}
        labels={{ previewTitle: TEST_OBJECT_TITLE }}
        renderPreview={() => null}
        scope={TEST_CHANGE_HISTORY_SCOPE}
        listPageSize={listPageSize}
        analytics={reportEvent ? { reportEvent } : undefined}
      >
        {children}
      </ChangeHistoryProvider>
    </QueryClientWrapper>
  );

  return { wrapper, queryClient };
};

describe('useChangeHistoryRestore', () => {
  it('calls adapter.restoreChange, invokes onRestored, then invalidates cache', async () => {
    const restoreChange = jest.fn().mockResolvedValue(undefined);
    const callOrder: string[] = [];
    const onRestored = jest.fn(async (): Promise<void> => {
      callOrder.push('onRestored');
    });
    const adapter = createAdapter(restoreChange);
    const { wrapper, queryClient } = createHarness(adapter);
    const invalidateSpy = jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementation(async () => {
        callOrder.push('invalidate');
      });

    const { result } = renderHook(() => useChangeHistoryRestore({ onRestored }), {
      wrapper,
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
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: changeHistoryObjectQueryKeyPrefix(TEST_OBJECT_ID, TEST_CHANGE_HISTORY_SCOPE),
      refetchType: 'active',
    });
    expect(onRestored).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['onRestored', 'invalidate']);
  });

  it('does not invoke onRestored or invalidate cache when restore fails', async () => {
    const restoreChange = jest.fn().mockRejectedValue({
      body: {
        code: 'RESTORE_CONFLICT',
        message: 'Object was updated by another user.',
      },
    });
    const onRestored = jest.fn(async (): Promise<void> => undefined);
    const adapter = createAdapter(restoreChange);
    const { wrapper, queryClient } = createHarness(adapter);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useChangeHistoryRestore({ onRestored }), {
      wrapper,
    });

    await act(async () => {
      const succeeded = await result.current.restoreChange({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
      });
      expect(succeeded).toBe(false);
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(onRestored).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.error).toEqual({
        code: 'RESTORE_CONFLICT',
        message: 'Object was updated by another user.',
      });
    });
  });

  it('does not call restore when the feature is disabled', async () => {
    const restoreChange = jest.fn();
    const onRestored = jest.fn(async (): Promise<void> => undefined);
    const adapter = createAdapter(restoreChange);
    const { wrapper, queryClient } = createHarness(adapter, { restore: false });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useChangeHistoryRestore({ onRestored }), {
      wrapper,
    });

    await act(async () => {
      const succeeded = await result.current.restoreChange({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
      });
      expect(succeeded).toBe(false);
    });

    expect(restoreChange).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(onRestored).not.toHaveBeenCalled();
    expect(result.current.canRestore).toBe(false);
  });

  it('reports restore_completed telemetry on success', async () => {
    const reportEvent = jest.fn();
    const restoreChange = jest.fn().mockResolvedValue(undefined);
    const adapter = createAdapter(restoreChange);
    const { wrapper } = createHarness(
      adapter,
      { restore: true },
      { canRestore: true },
      reportEvent
    );

    const { result } = renderHook(() => useChangeHistoryRestore(), { wrapper });

    await act(async () => {
      await result.current.restoreChange({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
        restoreTelemetry: {
          restoredFromSequence: 3,
          currentSequence: 7,
          rollbackDistance: 4,
        },
        confirmedAtMs: Date.now() - 25,
      });
    });

    expect(reportEvent).toHaveBeenCalledWith(
      ChangeHistoryTelemetryEventTypes.RestoreCompleted,
      expect.objectContaining({
        eventName: 'Change history restore completed',
        ...testScope,
        restoredFromSequence: 3,
        currentSequence: 7,
        rollbackDistance: 4,
        durationMs: expect.any(Number),
      })
    );
  });

  it('measures restore duration before onRestored and cache invalidation', async () => {
    const reportEvent = jest.fn();
    const restoreChange = jest.fn().mockResolvedValue(undefined);
    const onRestored = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 200)));
    const adapter = createAdapter(restoreChange);
    const { wrapper, queryClient } = createHarness(
      adapter,
      { restore: true },
      { canRestore: true },
      reportEvent
    );
    jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200)));

    const { result } = renderHook(() => useChangeHistoryRestore({ onRestored }), { wrapper });

    await act(async () => {
      await result.current.restoreChange({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
        confirmedAtMs: Date.now() - 30,
      });
    });

    const completedCall = reportEvent.mock.calls.find(
      ([eventType]) => eventType === ChangeHistoryTelemetryEventTypes.RestoreCompleted
    );
    expect(completedCall).toBeDefined();
    const durationMs = completedCall?.[1]?.durationMs as number;
    expect(durationMs).toBeGreaterThanOrEqual(25);
    expect(durationMs).toBeLessThan(150);
  });

  it('reports newSequence only after active list refetch completes', async () => {
    const reportEvent = jest.fn();
    let listFetchCount = 0;

    const listChanges = jest.fn().mockImplementation(async () => {
      listFetchCount += 1;

      if (listFetchCount === 1) {
        return {
          items: [
            {
              id: 'evt-7',
              timestamp: '2026-06-16T12:00:00.000Z',
              actor: { name: 'Alice' },
              action: 'update',
              isCurrent: true,
              metadata: { version: 7 },
            },
          ],
          total: 7,
        };
      }

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 50);
      });

      return {
        items: [
          {
            id: 'evt-8',
            timestamp: '2026-06-16T13:00:00.000Z',
            actor: { name: 'Alice' },
            action: 'restore',
            isCurrent: true,
            metadata: { version: 8 },
          },
        ],
        total: 8,
      };
    });

    const restoreChange = jest.fn().mockResolvedValue(undefined);
    const adapter: ChangeHistoryAdapter = {
      listChanges,
      getChange: jest.fn(),
      restoreChange,
    };
    const { wrapper } = createHarness(
      adapter,
      { restore: true },
      { canRestore: true },
      reportEvent
    );

    const { result } = renderHook(
      () => ({
        list: useChangeHistoryList({
          adapter,
          objectId: TEST_OBJECT_ID,
          enabled: true,
        }),
        restore: useChangeHistoryRestore(),
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.list.isLoading).toBe(false);
    });
    expect(listFetchCount).toBe(1);

    await act(async () => {
      await result.current.restore.restoreChange({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
        restoreTelemetry: {
          restoredFromSequence: 3,
          currentSequence: 7,
          rollbackDistance: 4,
        },
      });
    });

    expect(listFetchCount).toBeGreaterThanOrEqual(2);
    expect(reportEvent).toHaveBeenCalledWith(
      ChangeHistoryTelemetryEventTypes.RestoreCompleted,
      expect.objectContaining({
        restoredFromSequence: 3,
        currentSequence: 7,
        rollbackDistance: 4,
        newSequence: 8,
      })
    );
  });

  it('reports newSequence when provider listPageSize matches the active list query', async () => {
    const reportEvent = jest.fn();
    const customPageSize = 10;
    let listFetchCount = 0;

    const listChanges = jest.fn().mockImplementation(async ({ page }) => {
      listFetchCount += 1;
      expect(page.size).toBe(customPageSize);

      if (listFetchCount === 1) {
        return {
          items: [
            {
              id: 'evt-7',
              timestamp: '2026-06-16T12:00:00.000Z',
              actor: { name: 'Alice' },
              action: 'update',
              isCurrent: true,
              metadata: { version: 7 },
            },
          ],
          total: 7,
        };
      }

      return {
        items: [
          {
            id: 'evt-8',
            timestamp: '2026-06-16T13:00:00.000Z',
            actor: { name: 'Alice' },
            action: 'restore',
            isCurrent: true,
            metadata: { version: 8 },
          },
        ],
        total: 8,
      };
    });

    const restoreChange = jest.fn().mockResolvedValue(undefined);
    const adapter: ChangeHistoryAdapter = {
      listChanges,
      getChange: jest.fn(),
      restoreChange,
    };
    const { wrapper } = createHarness(
      adapter,
      { restore: true },
      { canRestore: true },
      reportEvent,
      customPageSize
    );

    const { result } = renderHook(
      () => ({
        list: useChangeHistoryList({
          adapter,
          objectId: TEST_OBJECT_ID,
          enabled: true,
        }),
        restore: useChangeHistoryRestore(),
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.list.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.restore.restoreChange({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
        restoreTelemetry: {
          restoredFromSequence: 3,
          currentSequence: 7,
          rollbackDistance: 4,
        },
      });
    });

    expect(reportEvent).toHaveBeenCalledWith(
      ChangeHistoryTelemetryEventTypes.RestoreCompleted,
      expect.objectContaining({
        newSequence: 8,
      })
    );
  });

  it('reports restore_failed telemetry when restore fails', async () => {
    const reportEvent = jest.fn();
    const restoreChange = jest.fn().mockRejectedValue({
      body: {
        code: 'RESTORE_CONFLICT',
        message: 'Object was updated by another user.',
      },
    });
    const adapter = createAdapter(restoreChange);
    const { wrapper } = createHarness(
      adapter,
      { restore: true },
      { canRestore: true },
      reportEvent
    );

    const { result } = renderHook(() => useChangeHistoryRestore(), { wrapper });

    await act(async () => {
      await result.current.restoreChange({
        objectId: TEST_OBJECT_ID,
        changeId: 'evt-3',
        restoreTelemetry: { rollbackDistance: 4 },
        confirmedAtMs: Date.now(),
      });
    });

    expect(reportEvent).toHaveBeenCalledWith(ChangeHistoryTelemetryEventTypes.RestoreFailed, {
      eventName: 'Change history restore failed',
      ...testScope,
      rollbackDistance: 4,
      errorCode: 'RESTORE_CONFLICT',
    });
  });
});
