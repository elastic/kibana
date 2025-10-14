/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import { useConvertIndexToLookup } from './use_convert_index_to_lookup';
import { getReindexStatus, startReindex } from '../../services';

jest.mock('../../services');

const mockedGetReindexStatus = getReindexStatus as jest.Mock;
const mockedStartReindex = startReindex as jest.Mock;

const defaultHookArgs = {
  sourceIndexName: 'my-index',
  onSuccess: jest.fn(),
  onClose: jest.fn(),
};

describe('useConvertIndexToLookup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('successful conversion', () => {
    it('should pool until completion', async () => {
      mockedStartReindex.mockResolvedValue({ data: {}, error: null });
      mockedGetReindexStatus
        .mockResolvedValueOnce({
          data: { reindexOp: { status: ReindexStatus.inProgress } },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { reindexOp: { status: ReindexStatus.inProgress } },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            reindexOp: {
              status: ReindexStatus.completed,
              newIndexName: 'lookup-my-index',
            },
          },
          error: null,
        });

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        result.current.convert('lookup-my-index');
      });

      expect(result.current.isConverting).toBe(true);

      // First poll after startReindex
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

      // Second poll after 3s
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });

      // Third poll after another 3s - completes
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });

      expect(defaultHookArgs.onSuccess).toHaveBeenCalledWith('lookup-my-index');
      expect(defaultHookArgs.onClose).toHaveBeenCalled();
      expect(result.current.isConverting).toBe(false);
      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(3);
    });

    it('should handle completion without newIndexName', async () => {
      mockedStartReindex.mockResolvedValue({ data: {}, error: null });
      mockedGetReindexStatus.mockResolvedValue({
        data: { reindexOp: { status: ReindexStatus.completed } },
        error: null,
      });

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      act(() => {
        result.current.convert('lookup-my-index');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

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

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

      expect(result.current.errorMessage).toBe(error.message);
      expect(result.current.isConverting).toBe(false);
    });

    it('should handle getReindexStatus failure and stop polling', async () => {
      const error = new Error('Failed to get reindex status');
      mockedStartReindex.mockResolvedValue({ data: {}, error: null });
      mockedGetReindexStatus.mockResolvedValue({ data: null, error });

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        result.current.convert('lookup-my-index');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

      expect(result.current.errorMessage).toBe(error.message);
      expect(result.current.isConverting).toBe(false);

      // Verify no more polls happen
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle failed reindex status', async () => {
      const errorMessage = 'Reindex failed';
      mockedStartReindex.mockResolvedValue({ data: {}, error: null });
      mockedGetReindexStatus.mockResolvedValue({
        data: { reindexOp: { status: ReindexStatus.failed, errorMessage } },
        error: null,
      });

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      act(() => {
        result.current.convert('lookup-my-index');
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

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
      mockedStartReindex.mockResolvedValue({ data: {}, error: null });
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
      mockedStartReindex.mockResolvedValue({ data: {}, error: null });
      mockedGetReindexStatus.mockResolvedValue({
        data: { reindexOp: { status: ReindexStatus.inProgress } },
        error: null,
      });

      const { result, unmount } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      await act(async () => {
        result.current.convert('lookup-my-index');
      });

      unmount();

      // Fast-forward time and assert that polling did not continue
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(1);
    });

    it('should clear poll interval when sourceIndexName changes', async () => {
      mockedStartReindex.mockResolvedValue({ data: {}, error: null });
      mockedGetReindexStatus.mockResolvedValue({
        data: { reindexOp: { status: ReindexStatus.inProgress } },
        error: null,
      });

      const { result, rerender } = renderHook((props) => useConvertIndexToLookup(props), {
        initialProps: defaultHookArgs,
      });

      act(() => {
        result.current.convert('lookup-my-index');
      });

      // Start polling
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

      // Change source index
      rerender({
        ...defaultHookArgs,
        sourceIndexName: 'different-index',
      });

      // Advance time - should not poll old index
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(1);
      expect(mockedGetReindexStatus).toHaveBeenCalledWith('my-index');
    });
  });

  describe('timing verification', () => {
    it('should poll at correct intervals', async () => {
      mockedStartReindex.mockResolvedValue({ data: {}, error: null });
      mockedGetReindexStatus.mockResolvedValue({
        data: { reindexOp: { status: ReindexStatus.inProgress } },
        error: null,
      });

      const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

      act(() => {
        result.current.convert('lookup-my-index');
      });

      // Initial poll
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(1);

      // Poll after exact interval
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });
      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(2);

      // No poll before interval
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2999);
      });
      expect(mockedGetReindexStatus).toHaveBeenCalledTimes(2);
    });
  });
});
