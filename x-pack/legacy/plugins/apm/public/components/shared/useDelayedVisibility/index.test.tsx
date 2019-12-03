/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useDelayedVisibility } from '.';

describe('useFetcher', () => {
  let hook;
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('is initially false', () => {
    hook = renderHook(isLoading => useDelayedVisibility(isLoading), {
      initialProps: false
    });
    expect(hook.result.current).toEqual(false);
  });

  it('does not change to true immediately', () => {
    hook = renderHook(isLoading => useDelayedVisibility(isLoading), {
      initialProps: false
    });

    hook.rerender(true);
    jest.advanceTimersByTime(10);
    expect(hook.result.current).toEqual(false);
    jest.advanceTimersByTime(50);
    expect(hook.result.current).toEqual(true);
  });

  it('does not change to false immediately', () => {
    hook = renderHook(isLoading => useDelayedVisibility(isLoading), {
      initialProps: false
    });

    hook.rerender(true);
    jest.advanceTimersByTime(100);
    hook.rerender(false);
    expect(hook.result.current).toEqual(true);
  });

  it('is true for minimum 1000ms', () => {
    hook = renderHook(isLoading => useDelayedVisibility(isLoading), {
      initialProps: false
    });

    hook.rerender(true);
    jest.advanceTimersByTime(100);
    hook.rerender(false);
    jest.advanceTimersByTime(900);
    expect(hook.result.current).toEqual(true);
    jest.advanceTimersByTime(100);
    expect(hook.result.current).toEqual(false);
  });
});
