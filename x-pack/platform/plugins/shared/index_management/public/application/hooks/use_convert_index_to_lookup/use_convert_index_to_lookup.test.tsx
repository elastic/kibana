/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { ReindexStatus } from '@kbn/reindex-service-plugin/common';
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
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle successful conversion', async () => {
    mockedStartReindex.mockResolvedValue({ data: {}, error: null });
    mockedGetReindexStatus
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

    await waitFor(() => {
      expect(defaultHookArgs.onSuccess).toHaveBeenCalledWith('lookup-my-index');
    });

    expect(defaultHookArgs.onClose).toHaveBeenCalled();
    expect(result.current.isConverting).toBe(false);
  });

  it('should handle startReindex failure', async () => {
    const error = new Error('Failed to start reindex');
    mockedStartReindex.mockResolvedValue({ data: null, error });

    const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

    await act(async () => {
      result.current.convert('lookup-my-index');
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe(error.message);
    });
    expect(result.current.isConverting).toBe(false);
  });

  it('should handle getReindexStatus failure', async () => {
    const error = new Error('Failed to get reindex status');
    mockedStartReindex.mockResolvedValue({ data: {}, error: null });
    mockedGetReindexStatus.mockResolvedValue({ data: null, error });

    const { result } = renderHook(() => useConvertIndexToLookup(defaultHookArgs));

    await act(async () => {
      result.current.convert('lookup-my-index');
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe(error.message);
    });
    expect(result.current.isConverting).toBe(false);
  });

  it('should clear poll interval on unmount', async () => {
    jest.useFakeTimers();
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
});
