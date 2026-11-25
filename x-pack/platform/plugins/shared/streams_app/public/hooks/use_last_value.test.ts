/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useLastValue } from './use_last_value';

const MAX_AGE_MS = 60_000;

describe('useLastValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const render = (initial: string | undefined) =>
    renderHook(({ value }) => useLastValue(value, { maxAgeMs: MAX_AGE_MS }), {
      initialProps: { value: initial },
    });

  it('is the value while it has one', () => {
    const { result } = render('a');

    expect(result.current).toBe('a');
  });

  it('is undefined while it has never had one', () => {
    const { result } = render(undefined);

    expect(result.current).toBeUndefined();
  });

  it('keeps showing the last value when the value goes away, and shows the next when it arrives', () => {
    const { result, rerender } = render('a');

    rerender({ value: undefined });
    expect(result.current).toBe('a');

    rerender({ value: 'b' });
    expect(result.current).toBe('b');
  });

  it('drops a last value that is older than the maximum age', () => {
    const { result, rerender } = render('a');

    jest.advanceTimersByTime(MAX_AGE_MS - 1);
    rerender({ value: undefined });
    expect(result.current).toBe('a');

    jest.advanceTimersByTime(1);
    rerender({ value: undefined });
    expect(result.current).toBeUndefined();
  });

  it('counts the age from when the value arrived, not from the last render', () => {
    const { result, rerender } = render('a');

    jest.advanceTimersByTime(40_000);
    rerender({ value: 'a' });
    jest.advanceTimersByTime(40_000);
    rerender({ value: undefined });

    expect(result.current).toBeUndefined();
  });
});
