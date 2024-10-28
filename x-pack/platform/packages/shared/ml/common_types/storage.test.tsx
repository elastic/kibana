/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { renderHook, act } from '@testing-library/react';

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { StorageContextProvider, useStorage } from '@kbn/ml-local-storage';

import { ML_STORAGE_KEYS } from './storage';

const mockSet = jest.fn();
const mockRemove = jest.fn();
const mockStorage: Storage = {
  set: mockSet,
  get: jest.fn((key: string) => {
    switch (key) {
      case 'ml.gettingStarted.isDismissed':
        return true;
      default:
        return;
    }
  }),
  remove: mockRemove,
  store: jest.fn() as any,
  clear: jest.fn(),
};

const Provider: FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <StorageContextProvider storage={mockStorage} storageKeys={ML_STORAGE_KEYS}>
      {children}
    </StorageContextProvider>
  );
};

describe('useStorage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns the default value', () => {
    const { result } = renderHook(() => useStorage('ml.jobSelectorFlyout.applyTimeRange', true), {
      wrapper: Provider,
    });

    expect(result.current[0]).toBe(true);
  });

  test('returns the value from storage', () => {
    const { result } = renderHook(() => useStorage('ml.gettingStarted.isDismissed', false), {
      wrapper: Provider,
    });

    expect(result.current[0]).toBe(true);
  });

  test('updates the storage value', async () => {
    const { result } = renderHook(() => useStorage('ml.gettingStarted.isDismissed'), {
      wrapper: Provider,
    });

    const [value, setValue] = result.current;

    expect(value).toBe(true);

    await act(async () => {
      setValue(false);
    });

    expect(result.current[0]).toBe(false);
    expect(mockSet).toHaveBeenCalledWith('ml.gettingStarted.isDismissed', false);
  });

  test('removes the storage value', async () => {
    const { result } = renderHook(() => useStorage('ml.gettingStarted.isDismissed'), {
      wrapper: Provider,
    });

    const [value, setValue] = result.current;

    expect(value).toBe(true);

    await act(async () => {
      setValue(undefined);
    });

    expect(result.current[0]).toBe(undefined);
    expect(mockRemove).toHaveBeenCalledWith('ml.gettingStarted.isDismissed');
  });

  test('updates the value on storage event', async () => {
    const { result } = renderHook(() => useStorage('ml.gettingStarted.isDismissed'), {
      wrapper: Provider,
    });

    expect(result.current[0]).toBe(true);

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'test_key',
          newValue: 'test_value',
        })
      );
    });

    expect(result.current[0]).toBe(true);

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'ml.gettingStarted.isDismissed',
          newValue: null,
        })
      );
    });

    expect(result.current[0]).toBe(undefined);

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'ml.gettingStarted.isDismissed',
          newValue: 'false',
        })
      );
    });

    expect(result.current[0]).toBe(false);
  });
});
