/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { useLoadList } from './use_load_list';

describe('useLoadList', () => {
  it('loads items on mount and sets hasLoaded', async () => {
    const get = jest.fn().mockResolvedValue([1, 2, 3]);

    const { result } = renderHook(() => useLoadList(get));

    expect(result.current.hasLoaded).toBe(false);
    expect(result.current.items).toEqual([]);

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });

    expect(result.current.items).toEqual([1, 2, 3]);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
  });

  it('sets empty items and hasLoaded when get throws', async () => {
    const get = jest.fn().mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useLoadList(get));

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });

    expect(result.current.items).toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('reload calls get again and updates items', async () => {
    const get = jest.fn().mockResolvedValueOnce([1]).mockResolvedValueOnce([2, 3]);

    const { result } = renderHook(() => useLoadList(get));

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });
    expect(result.current.items).toEqual([1]);

    await act(async () => {
      await result.current.reload();
    });

    expect(get).toHaveBeenCalledTimes(2);
    // reload() doesn't use AbortSignal; it calls load() without a signal.
    expect(get.mock.calls[1][0]).toEqual({ signal: undefined });
    expect(result.current.items).toEqual([2, 3]);
  });

  it('does not update state after unmount (aborted signal)', async () => {
    let resolve!: (items: number[]) => void;
    let capturedSignal: AbortSignal | undefined;

    const get = jest.fn().mockImplementation(({ signal }: { signal?: AbortSignal } = {}) => {
      capturedSignal = signal;
      return new Promise<number[]>((r) => {
        resolve = r;
      });
    });

    const { result, unmount } = renderHook(() => useLoadList(get));
    expect(result.current.hasLoaded).toBe(false);

    unmount();

    // Unmount triggers AbortController.abort(); our hook should refuse to set state afterward.
    expect(capturedSignal?.aborted).toBe(true);

    // Resolving after unmount should not throw or warn; we just ensure the promise resolves cleanly.
    await act(async () => {
      resolve([9]);
      await Promise.resolve();
    });
  });
});
