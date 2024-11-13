/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useLocalStorage } from './use_local_storage';

describe('useLocalStorage', () => {
  const key = 'testKey';
  const defaultValue = 'defaultValue';

  beforeEach(() => {
    localStorage.clear();
  });

  it('should return the default value when local storage is empty', () => {
    const { result } = renderHook(() => useLocalStorage(key, defaultValue));
    const [item] = result.current;

    expect(item).toBe(defaultValue);
  });

  it('should return the stored value when local storage has a value', () => {
    const storedValue = 'storedValue';
    localStorage.setItem(key, JSON.stringify(storedValue));
    const { result } = renderHook(() => useLocalStorage(key, defaultValue));
    const [item] = result.current;

    expect(item).toBe(storedValue);
  });

  it('should save the value to local storage', () => {
    const { result } = renderHook(() => useLocalStorage(key, defaultValue));
    const [, saveToStorage] = result.current;
    const newValue = 'newValue';

    act(() => {
      saveToStorage(newValue);
    });

    expect(JSON.parse(localStorage.getItem(key) || '')).toBe(newValue);
  });

  it('should remove the value from local storage when the value is undefined', () => {
    const { result } = renderHook(() => useLocalStorage(key, defaultValue));
    const [, saveToStorage] = result.current;

    act(() => {
      saveToStorage(undefined as unknown as string);
    });

    expect(localStorage.getItem(key)).toBe(null);
  });

  it('should listen for storage events to window, and remove the listener upon unmount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useLocalStorage(key, defaultValue));

    expect(addEventListenerSpy).toHaveBeenCalled();

    const eventTypes = addEventListenerSpy.mock.calls;

    expect(eventTypes).toContainEqual(['storage', expect.any(Function)]);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});
