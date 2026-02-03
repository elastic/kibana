/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import {
  ReindexStep,
  type ReindexOperation,
  type ReindexStatusResponse,
} from '@kbn/reindex-service-plugin/common';
import { useConvertIndexToLookup } from './use_convert_index_to_lookup';
import { getReindexStatus, startReindex } from '../../services';
import { advanceTimersByTime } from '../../../../__jest__/helpers/fake_timers';

jest.mock('../../services');

const mockedGetReindexStatus = jest.mocked(getReindexStatus);
const mockedStartReindex = jest.mocked(startReindex);

const SOURCE_INDEX_NAME = 'my-index';

const createReindexOperation = (overrides: Partial<ReindexOperation> = {}): ReindexOperation => ({
  indexName: SOURCE_INDEX_NAME,
  newIndexName: `lookup-${SOURCE_INDEX_NAME}`,
  status: ReindexStatus.inProgress,
  lastCompletedStep: ReindexStep.created,
  locked: null,
  reindexTaskId: null,
  reindexTaskPercComplete: null,
  errorMessage: null,
  runningReindexCount: null,
  ...overrides,
});

const createReindexStatusResponse = (
  overrides: Partial<ReindexStatusResponse> = {}
): ReindexStatusResponse => ({
  meta: {
    indexName: SOURCE_INDEX_NAME,
    aliases: [],
    isReadonly: false,
    isFrozen: false,
    isInDataStream: false,
    isFollowerIndex: false,
    ...overrides.meta,
  },
  ...overrides,
});

const defaultHookArgs = {
  sourceIndexName: SOURCE_INDEX_NAME,
  onSuccess: jest.fn(),
  onClose: jest.fn(),
};

describe('useConvertIndexToLookup', () => {
  beforeEach(() => {
    // NOTE: This suite intentionally uses fake timers for performance.
    // The hook polls on an interval (e.g. 3s). Using real timers would introduce real-time waits in CI.
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('successful conversion', () => {
    it('should pool until completion', async () => {
      mockedStartReindex.mockResolvedValue({ data: createReindexOperation(), error: null });
      mockedGetReindexStatus
        .mockResolvedValueOnce({
          data: createReindexStatusResponse({
            reindexOp: createReindexOperation({ status: ReindexStatus.inProgress }),
          }),
          error: null,
        })
        .mockResolvedValueOnce({
          data: createReindexStatusResponse({
            reindexOp: createReindexOperation({ status: ReindexStatus.inProgress }),
          }),
          error: null,
        })
        .mockResolvedValueOnce({
          data: createReindexStatusResponse({
            reindexOp: createReindexOperation({
              status: ReindexStatus.completed,
              newIndexName: 'lookup-my-index',
            }),
          }),
          error: null,
        });

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        result.current.convert('lookup-my-index');
      });

      expect(result.current.isConverting).toBe(true);

      // First poll after startReindex
      await advanceTimersByTime(0);

      // Second poll after 3s
      await advanceTimersByTime(3000);

      // Third poll after another 3s - completes
      await advanceTimersByTime(3000);

      expect(defaultHookArgs.onSuccess).toHaveBeenCalledWith('lookup-my-index');
      expect(defaultHookArgs.onClose).toHaveBeenCalled();
      expect(result.current.isConverting).toBe(false);
      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(3);
    });

    it('should handle completion without newIndexName', async () => {
      mockedStartReindex.mockResolvedValue({ data: createReindexOperation(), error: null });
      mockedGetReindexStatus.mockResolvedValue({
        data: createReindexStatusResponse({
          reindexOp: createReindexOperation({
            status: ReindexStatus.completed,
            // Keep this falsy so the hook does not call onSuccess.
            newIndexName: '',
          }),
        }),
        error: null,
      });

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        result.current.convert('lookup-my-index');
      });

      await advanceTimersByTime(0);

      expect(defaultHookArgs.onSuccess).not.toHaveBeenCalled();
      expect(defaultHookArgs.onClose).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle startReindex failure', async () => {
      const error = new Error('Failed to start reindex');
      mockedStartReindex.mockResolvedValue({ data: null, error });

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        result.current.convert('lookup-my-index');
      });

      expect(result.current.errorMessage).toBe(error.message);
      expect(result.current.isConverting).toBe(false);
    });

    it('should handle getReindexStatus failure and stop polling', async () => {
      const error = new Error('Failed to get reindex status');
      mockedStartReindex.mockResolvedValue({ data: createReindexOperation(), error: null });
      mockedGetReindexStatus.mockResolvedValue({ data: null, error });

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        result.current.convert('lookup-my-index');
      });

      await advanceTimersByTime(0);

      expect(result.current.errorMessage).toBe(error.message);
      expect(result.current.isConverting).toBe(false);

      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle failed reindex status', async () => {
      const errorMessage = 'Reindex failed';
      mockedStartReindex.mockResolvedValue({ data: createReindexOperation(), error: null });
      mockedGetReindexStatus.mockResolvedValue({
        data: createReindexStatusResponse({
          reindexOp: createReindexOperation({ status: ReindexStatus.failed, errorMessage }),
        }),
        error: null,
      });

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        result.current.convert('lookup-my-index');
      });

      await advanceTimersByTime(0);

      expect(result.current.errorMessage).toBe(errorMessage);
      expect(result.current.isConverting).toBe(false);
    });

    it('should handle a thrown error from startReindex', async () => {
      const thrownError = new Error('Failure during startReindex');
      mockedStartReindex.mockRejectedValue(thrownError);

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        await result.current.convert('lookup-my-index');
      });

      expect(result.current.errorMessage).toBe('An unexpected error occurred.');
      expect(result.current.isConverting).toBe(false);
      expect(mockedGetReindexStatus).not.toHaveBeenCalled();
    });

    it('should handle a thrown error from getReindexStatus', async () => {
      const thrownError = new Error('Failure during getReindexStatus');
      mockedStartReindex.mockResolvedValue({ data: createReindexOperation(), error: null });
      mockedGetReindexStatus.mockRejectedValue(thrownError);

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        await result.current.convert('lookup-my-index');
      });

      expect(result.current.errorMessage).toBe('An unexpected error occurred.');
      expect(result.current.isConverting).toBe(false);
    });
  });

  describe('cleanup logic', () => {
    it('should clear poll interval on unmount', async () => {
      mockedStartReindex.mockResolvedValue({ data: createReindexOperation(), error: null });
      mockedGetReindexStatus.mockResolvedValue({
        data: createReindexStatusResponse({
          reindexOp: createReindexOperation({ status: ReindexStatus.inProgress }),
        }),
        error: null,
      });

      const { result, unmount } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        result.current.convert('lookup-my-index');
      });

      // Start polling
      await advanceTimersByTime(0);

      unmount();

      // Fast-forward time and assert that polling did not continue
      await advanceTimersByTime(6000);

      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(1);
    });

    it('should clear poll interval when sourceIndexName changes', async () => {
      mockedStartReindex.mockResolvedValue({ data: createReindexOperation(), error: null });
      mockedGetReindexStatus.mockResolvedValue({
        data: createReindexStatusResponse({
          reindexOp: createReindexOperation({ status: ReindexStatus.inProgress }),
        }),
        error: null,
      });

      const { result, rerender } = renderHook((props) => useConvertIndexToLookup(props), {
        initialProps: defaultHookArgs,
      });

      await act(async () => {
        result.current.convert('lookup-my-index');
      });

      // Start polling
      await advanceTimersByTime(0);

      // Change source index
      rerender({
        ...defaultHookArgs,
        sourceIndexName: 'different-index',
      });

      // Advance time - should not poll old index
      await advanceTimersByTime(6000);

      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(1);
      expect(mockedGetReindexStatus).toHaveBeenCalledWith(SOURCE_INDEX_NAME);
    });
  });

  describe('timing verification', () => {
    it('should poll at correct intervals', async () => {
      mockedStartReindex.mockResolvedValue({ data: createReindexOperation(), error: null });
      mockedGetReindexStatus.mockResolvedValue({
        data: createReindexStatusResponse({
          reindexOp: createReindexOperation({ status: ReindexStatus.inProgress }),
        }),
        error: null,
      });

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        result.current.convert('lookup-my-index');
      });

      // Initial poll
      await advanceTimersByTime(0);
      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(1);

      // Poll after exact interval
      await advanceTimersByTime(3000);
      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(2);

      // No poll before interval
      await advanceTimersByTime(2999);
      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(2);
    });
  });
});
