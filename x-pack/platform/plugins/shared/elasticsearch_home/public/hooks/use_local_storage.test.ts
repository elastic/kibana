/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useLocalStorage } from './use_local_storage';

beforeEach(() => {
  localStorage.clear();
});

describe('useLocalStorage', () => {
  it('returns defaultValue when storage has no entry for the key', () => {
    const { result } = renderHook(() => useLocalStorage('myKey', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('reads an existing value from storage on mount', () => {
    localStorage.setItem('myKey', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('myKey', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('updates state and writes to storage when the setter is called', () => {
    const { result } = renderHook(() => useLocalStorage('myKey', 'default'));

    act(() => {
      result.current[1]('new value');
    });

    expect(result.current[0]).toBe('new value');
    expect(localStorage.getItem('myKey')).toBe(JSON.stringify('new value'));
  });

  it('handles boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('dismissed', false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem('dismissed')).toBe('true');
  });

  it('handles object values', () => {
    const { result } = renderHook(() => useLocalStorage('obj', { count: 0 }));

    act(() => {
      result.current[1]({ count: 5 });
    });

    expect(result.current[0]).toEqual({ count: 5 });
    expect(localStorage.getItem('obj')).toBe(JSON.stringify({ count: 5 }));
  });

  it('returns defaultValue when stored JSON is malformed', () => {
    localStorage.setItem('myKey', 'not-valid-json{{{');
    const { result } = renderHook(() => useLocalStorage('myKey', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('silently ignores write errors from storage', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full');
    });

    const { result } = renderHook(() => useLocalStorage('key', 'default'));

    expect(() => {
      act(() => {
        result.current[1]('new value');
      });
    }).not.toThrow();

    // State is still updated in memory even though persistence failed
    expect(result.current[0]).toBe('new value');

    setItemSpy.mockRestore();
  });
});
