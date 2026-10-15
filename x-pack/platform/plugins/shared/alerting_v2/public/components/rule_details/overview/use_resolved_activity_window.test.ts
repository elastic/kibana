/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { resolveGteLte } from './time_range';
import { resolveRefreshWindow, useResolvedActivityWindow } from './use_resolved_activity_window';

const ABSOLUTE_FROM = '2026-08-01T00:00:00.000Z';
const ABSOLUTE_TO = '2026-08-08T00:00:00.000Z';

describe('resolveRefreshWindow', () => {
  it('reports unchanged bounds for an absolute range so the caller can refetch', () => {
    const current = resolveGteLte(ABSOLUTE_FROM, ABSOLUTE_TO);
    const result = resolveRefreshWindow(ABSOLUTE_FROM, ABSOLUTE_TO, current);

    expect(result.boundsChanged).toBe(false);
    expect(result.next).toEqual(current);
  });

  it('reports changed bounds when a relative range slides forward', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    const current = resolveGteLte('now-7d', 'now');

    jest.setSystemTime(new Date('2026-08-14T12:05:00.000Z'));
    const result = resolveRefreshWindow('now-7d', 'now', current);

    expect(result.boundsChanged).toBe(true);
    expect(result.next.windowEndMs).toBe(Date.parse('2026-08-14T12:05:00.000Z'));
    expect(result.next.windowStartMs).toBe(Date.parse('2026-08-07T12:05:00.000Z'));

    jest.useRealTimers();
  });
});

describe('useResolvedActivityWindow', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('refetches when refresh does not move the resolved bounds', () => {
    const refetch = jest.fn();
    const { result } = renderHook(() => useResolvedActivityWindow(ABSOLUTE_FROM, ABSOLUTE_TO));

    act(() => {
      result.current.applyRefresh(refetch);
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(result.current.windowStartMs).toBe(Date.parse(ABSOLUTE_FROM));
    expect(result.current.windowEndMs).toBe(Date.parse(ABSOLUTE_TO));
  });

  it('applies new bounds and skips refetch when a relative range moves', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    const refetch = jest.fn();
    const { result } = renderHook(() => useResolvedActivityWindow('now-7d', 'now'));

    expect(result.current.windowEndMs).toBe(Date.parse('2026-08-14T12:00:00.000Z'));

    jest.setSystemTime(new Date('2026-08-14T12:05:00.000Z'));
    act(() => {
      result.current.applyRefresh(refetch);
    });

    expect(refetch).not.toHaveBeenCalled();
    expect(result.current.windowEndMs).toBe(Date.parse('2026-08-14T12:05:00.000Z'));
    expect(result.current.windowStartMs).toBe(Date.parse('2026-08-07T12:05:00.000Z'));
  });

  it('re-resolves when the selected range changes', () => {
    const { result, rerender } = renderHook(({ from, to }) => useResolvedActivityWindow(from, to), {
      initialProps: { from: 'now-7d', to: 'now' },
    });

    rerender({ from: ABSOLUTE_FROM, to: ABSOLUTE_TO });

    expect(result.current.windowStartMs).toBe(Date.parse(ABSOLUTE_FROM));
    expect(result.current.windowEndMs).toBe(Date.parse(ABSOLUTE_TO));
  });
});
