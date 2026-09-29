/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { of, throwError } from 'rxjs';
import { useMlNotifications, MlNotificationsContextProvider } from './ml_notifications_context';
import { useStorage } from '@kbn/ml-local-storage';
import { useMlKibana } from '../kibana';

const mockCountMessages = vi.fn(() => {
  return of({ info: 1, error: 0, warning: 0 });
});

const mockKibana = {
  services: {
    mlServices: {
      mlApi: {
        notifications: {
          countMessages$: mockCountMessages,
        },
      },
    },
    application: {
      capabilities: {
        ml: {
          canGetJobs: true,
          canGetDataFrameAnalytics: true,
          canGetTrainedModels: true,
        },
      },
    },
  },
};

vi.mock('../kibana', () => {
      const mocked = {
      useMlKibana: vi.fn(() => {
        return mockKibana;
      }),
    };
      return { ...mocked, default: mocked };
    });

const mockSetStorageValue = vi.fn();
vi.mock('@kbn/ml-local-storage', () => {
      const mocked = {
      useStorage: vi.fn(() => {
        return [undefined, mockSetStorageValue];
      }),
    };
      return { ...mocked, default: mocked };
    });

describe('useMlNotifications', () => {
  beforeEach(() => {
    // Set mocks to the default values
    (useMlKibana as MockedFunction<typeof useMlKibana>).mockReturnValue(
      mockKibana as unknown as ReturnType<typeof useMlKibana>
    );

    vi.useFakeTimers();
    vi.setSystemTime(1663945337063);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test('retries polling on error with 1m delay', () => {
    mockKibana.services.mlServices.mlApi.notifications.countMessages$.mockReturnValueOnce(
      throwError(() => new Error('Cluster is down'))
    );

    renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(mockKibana.services.mlServices.mlApi.notifications.countMessages$).toHaveBeenCalledTimes(
      1
    );
    expect(mockKibana.services.mlServices.mlApi.notifications.countMessages$).toHaveBeenCalledWith({
      lastCheckedAt: 1663340537063,
    });

    act(() => {
      // ticks 4 minutes
      vi.advanceTimersByTime(60000 * 4);
    });

    expect(mockKibana.services.mlServices.mlApi.notifications.countMessages$).toHaveBeenCalledTimes(
      4
    );
    expect(mockKibana.services.mlServices.mlApi.notifications.countMessages$).toHaveBeenCalledWith({
      lastCheckedAt: 1663340537063,
    });
  });

  test('returns the default values', () => {
    const { result } = renderHook(useMlNotifications, { wrapper: MlNotificationsContextProvider });
    expect(result.current.notificationsCounts).toEqual({ info: 0, error: 0, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(null);
    expect(result.current.lastCheckedAt).toEqual(undefined);
  });

  test('starts only one subscription on mount', () => {
    const { rerender } = renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(1);

    rerender();
    rerender();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(1);
  });

  test('starts polling for notifications with a 1 minute interval during the last week by default ', () => {
    const { result } = renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(1);
    expect(mockCountMessages).toHaveBeenCalledWith({ lastCheckedAt: 1663340537063 });
    expect(result.current.notificationsCounts).toEqual({ info: 1, error: 0, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(1663340537063);
    expect(result.current.lastCheckedAt).toEqual(undefined);

    act(() => {
      mockCountMessages.mockReturnValueOnce(of({ info: 1, error: 2, warning: 0 }));
      vi.advanceTimersByTime(60000);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(2);
    expect(mockCountMessages).toHaveBeenCalledWith({ lastCheckedAt: 1663340537063 + 60000 });
    expect(result.current.notificationsCounts).toEqual({ info: 1, error: 2, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(1663340537063 + 60000);
    expect(result.current.lastCheckedAt).toEqual(undefined);
  });

  test('starts polling for notifications with a 1 minute interval using the lastCheckedAt from storage', () => {
    (useStorage as MockedFunction<typeof useStorage>).mockReturnValue([
      1664551009292,
      mockSetStorageValue,
    ]);
    const { result } = renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(1);
    expect(mockCountMessages).toHaveBeenCalledWith({ lastCheckedAt: 1664551009292 });
    expect(result.current.notificationsCounts).toEqual({ info: 1, error: 0, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(1664551009292);
    expect(result.current.lastCheckedAt).toEqual(1664551009292);
  });

  test('switches to polling with the lastCheckedAt from storage when available', () => {
    (useStorage as MockedFunction<typeof useStorage>).mockReturnValue([
      undefined,
      mockSetStorageValue,
    ]);
    const { result, rerender } = renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(1);
    expect(mockCountMessages).toHaveBeenCalledWith({ lastCheckedAt: 1663340537063 });
    expect(result.current.notificationsCounts).toEqual({ info: 1, error: 0, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(1663340537063);
    expect(result.current.lastCheckedAt).toEqual(undefined);

    act(() => {
      (useStorage as MockedFunction<typeof useStorage>).mockReturnValue([
        1664551009292,
        mockSetStorageValue,
      ]);
    });

    rerender();

    expect(mockCountMessages).toHaveBeenCalledTimes(2);
    expect(mockCountMessages).toHaveBeenCalledWith({ lastCheckedAt: 1664551009292 });
    expect(result.current.notificationsCounts).toEqual({ info: 1, error: 0, warning: 0 });
    expect(result.current.latestRequestedAt).toEqual(1664551009292);
    expect(result.current.lastCheckedAt).toEqual(1664551009292);
  });

  test('stops fetching notifications on leave', () => {
    const { unmount } = renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(mockCountMessages).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      vi.advanceTimersByTime(60001);
    });
    expect(mockCountMessages).toHaveBeenCalledTimes(1);
  });

  test('does not start polling if requires capabilities are missing', () => {
    mockKibana.services.application.capabilities.ml = {
      canGetJobs: true,
      canGetDataFrameAnalytics: false,
      canGetTrainedModels: true,
    };

    renderHook(useMlNotifications, {
      wrapper: MlNotificationsContextProvider,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(
      mockKibana.services.mlServices.mlApi.notifications.countMessages$
    ).not.toHaveBeenCalled();
  });
});
