/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { Subject } from 'rxjs';
import { useEpisodesTimeRange } from './use_episodes_time_range';

describe('useEpisodesTimeRange', () => {
  const mockSetTime = jest.fn();
  const mockGetTime = jest.fn().mockReturnValue({ from: 'now-24h', to: 'now' });
  const timeUpdate$ = new Subject<void>();

  const mockTimefilter = {
    getTimeUpdate$: jest.fn().mockReturnValue(timeUpdate$),
    getTime: mockGetTime,
    setTime: mockSetTime,
  } as unknown as Parameters<typeof useEpisodesTimeRange>[0];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTime.mockReturnValue({ from: 'now-24h', to: 'now' });
  });

  it('returns the current time range from getTime on mount', () => {
    const { result } = renderHook(() => useEpisodesTimeRange(mockTimefilter));
    expect(result.current.timeRange).toEqual({ from: 'now-24h', to: 'now' });
  });

  it('updates timeRange when the timeUpdate$ observable emits', () => {
    mockGetTime
      .mockReturnValueOnce({ from: 'now-24h', to: 'now' })
      .mockReturnValueOnce({ from: 'now-7d', to: 'now' });

    const { result } = renderHook(() => useEpisodesTimeRange(mockTimefilter));

    act(() => {
      timeUpdate$.next();
    });

    expect(result.current.timeRange).toEqual({ from: 'now-7d', to: 'now' });
  });

  it('handleTimeChange calls setTime with the provided range', () => {
    const { result } = renderHook(() => useEpisodesTimeRange(mockTimefilter));
    const newRange = { from: 'now-1h', to: 'now' };

    act(() => {
      result.current.handleTimeChange(newRange);
    });

    expect(mockSetTime).toHaveBeenCalledWith(newRange);
  });
});
