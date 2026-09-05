/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { createMemoryHistory, type MemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { DEFAULT_ACTIVITY_TIME_RANGE } from '../time_range';
import {
  ACTIVITY_TIME_RANGE_APP_STATE_KEY,
  ACTIVITY_TIME_RANGE_STORAGE_KEY,
} from '../activity_time_range_state';
import { useAlertTimelineUrlState } from './use_alert_timeline_url_state';

const CUSTOM_RANGE = { from: 'now-7d', to: 'now' };

const createMockStorage = (initialValue: unknown = null): Storage =>
  ({
    get: jest.fn().mockReturnValue(initialValue),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  } as unknown as Storage);

const createStatefulStorage = (initialValue: unknown = null): Storage => {
  let stored: unknown = initialValue;
  return {
    get: jest.fn(() => stored),
    set: jest.fn((_, value: unknown) => {
      stored = value;
    }),
    remove: jest.fn(() => {
      stored = null;
    }),
    clear: jest.fn(),
  } as unknown as Storage;
};

const createWrapper = (history: MemoryHistory) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Router history={history}>{children}</Router>
  );
  return Wrapper;
};

describe('useAlertTimelineUrlState', () => {
  it('returns the default and does not write when URL and storage are empty', () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createMockStorage(null);

    const { result } = renderHook(() => useAlertTimelineUrlState(mockStorage), {
      wrapper: createWrapper(history),
    });

    expect(result.current[0]).toEqual(DEFAULT_ACTIVITY_TIME_RANGE);
    expect(mockStorage.set).not.toHaveBeenCalled();
    expect(history.location.search).toBe('');
  });

  it('seeds state from localStorage and mirrors it into the URL without a history entry', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createMockStorage(CUSTOM_RANGE);

    const { result } = renderHook(() => useAlertTimelineUrlState(mockStorage), {
      wrapper: createWrapper(history),
    });
    await act(async () => {});

    expect(result.current[0]).toEqual(CUSTOM_RANGE);
    expect(mockStorage.get).toHaveBeenCalledWith(ACTIVITY_TIME_RANGE_STORAGE_KEY);
    expect(history.location.search).toContain('_a=');
    expect(history.index).toBe(0);
  });

  it('restores from localStorage on a fresh page load with an empty query', async () => {
    const mockStorage = createStatefulStorage(CUSTOM_RANGE);

    const first = renderHook(() => useAlertTimelineUrlState(mockStorage), {
      wrapper: createWrapper(createMemoryHistory({ initialEntries: ['/'] })),
    });
    await act(async () => {});
    expect(first.result.current[0]).toEqual(CUSTOM_RANGE);
    first.unmount();

    const second = renderHook(() => useAlertTimelineUrlState(mockStorage), {
      wrapper: createWrapper(createMemoryHistory({ initialEntries: ['/'] })),
    });
    await act(async () => {});
    expect(second.result.current[0]).toEqual(CUSTOM_RANGE);
  });

  it('lets the URL win over localStorage on mount', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const urlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    });
    const mockStorage = createMockStorage(CUSTOM_RANGE);
    const urlRange = { from: 'now-1h', to: 'now' };

    await act(async () => {
      await urlStateStorage.set(
        '_a',
        { [ACTIVITY_TIME_RANGE_APP_STATE_KEY]: urlRange },
        { replace: true }
      );
    });

    const { result } = renderHook(() => useAlertTimelineUrlState(mockStorage), {
      wrapper: createWrapper(history),
    });

    expect(result.current[0]).toEqual(urlRange);
  });

  it('falls through invalid URL and storage without throwing', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const urlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    });
    const mockStorage = createMockStorage({ from: '2026-13-45T00:00:00.000Z', to: 'now' });

    await act(async () => {
      await urlStateStorage.set(
        '_a',
        { [ACTIVITY_TIME_RANGE_APP_STATE_KEY]: { from: '', to: 'now' } },
        { replace: true }
      );
    });

    const { result } = renderHook(() => useAlertTimelineUrlState(mockStorage), {
      wrapper: createWrapper(history),
    });

    expect(result.current[0]).toEqual(DEFAULT_ACTIVITY_TIME_RANGE);
  });

  it('setTimeRange writes a non-default range to both stores', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createStatefulStorage(null);

    const { result } = renderHook(() => useAlertTimelineUrlState(mockStorage), {
      wrapper: createWrapper(history),
    });

    await act(async () => {
      result.current[1](CUSTOM_RANGE);
    });

    expect(result.current[0]).toEqual(CUSTOM_RANGE);
    expect(mockStorage.set).toHaveBeenCalledWith(ACTIVITY_TIME_RANGE_STORAGE_KEY, CUSTOM_RANGE);
    expect(history.location.search).toContain('_a=');
  });

  it('setTimeRange persists an explicitly selected default like any other range', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createStatefulStorage(CUSTOM_RANGE);

    const { result } = renderHook(() => useAlertTimelineUrlState(mockStorage), {
      wrapper: createWrapper(history),
    });

    expect(result.current[0]).toEqual(CUSTOM_RANGE);

    await act(async () => {
      result.current[1](DEFAULT_ACTIVITY_TIME_RANGE);
    });

    expect(result.current[0]).toEqual(DEFAULT_ACTIVITY_TIME_RANGE);
    expect(mockStorage.set).toHaveBeenCalledWith(
      ACTIVITY_TIME_RANGE_STORAGE_KEY,
      DEFAULT_ACTIVITY_TIME_RANGE
    );
    expect(history.location.search).toContain('activityTimeRange');
  });

  it('re-syncs from the URL on browser Back/Forward', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const urlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    });
    const mockStorage = createMockStorage(null);

    await act(async () => {
      await urlStateStorage.set(
        '_a',
        { [ACTIVITY_TIME_RANGE_APP_STATE_KEY]: CUSTOM_RANGE },
        { replace: true }
      );
    });

    const { result } = renderHook(() => useAlertTimelineUrlState(mockStorage), {
      wrapper: createWrapper(history),
    });
    expect(result.current[0]).toEqual(CUSTOM_RANGE);

    await act(async () => {
      await urlStateStorage.set(
        '_a',
        { [ACTIVITY_TIME_RANGE_APP_STATE_KEY]: { from: 'now-1h', to: 'now' } },
        { replace: false }
      );
    });
    expect(result.current[0]).toEqual({ from: 'now-1h', to: 'now' });

    await act(async () => {
      history.goBack();
    });

    expect(result.current[0]).toEqual(CUSTOM_RANGE);
  });

  it('creates a history entry per user change so Back/Forward steps through ranges', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createStatefulStorage(null);
    const secondRange = { from: 'now-1h', to: 'now' };

    const { result } = renderHook(() => useAlertTimelineUrlState(mockStorage), {
      wrapper: createWrapper(history),
    });
    expect(result.current[0]).toEqual(DEFAULT_ACTIVITY_TIME_RANGE);
    expect(history.index).toBe(0);

    await act(async () => {
      result.current[1](CUSTOM_RANGE);
    });
    await act(async () => {
      result.current[1](secondRange);
    });
    expect(result.current[0]).toEqual(secondRange);
    expect(history.index).toBe(2);

    await act(async () => {
      history.goBack();
    });
    expect(result.current[0]).toEqual(CUSTOM_RANGE);

    /* Back past the first change restores the default in the view, but navigation
     * is not an explicit choice so localStorage keeps the last picked range. */
    const storageWritesBeforeNavigation = (mockStorage.set as jest.Mock).mock.calls.length;
    await act(async () => {
      history.goBack();
    });
    expect(result.current[0]).toEqual(DEFAULT_ACTIVITY_TIME_RANGE);
    expect((mockStorage.set as jest.Mock).mock.calls).toHaveLength(storageWritesBeforeNavigation);
    expect(mockStorage.get(ACTIVITY_TIME_RANGE_STORAGE_KEY)).toEqual(secondRange);

    await act(async () => {
      history.goForward();
    });
    expect(result.current[0]).toEqual(CUSTOM_RANGE);
  });

  it('Back restores a storage-seeded range, not the default', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createStatefulStorage(CUSTOM_RANGE);

    const { result } = renderHook(() => useAlertTimelineUrlState(mockStorage), {
      wrapper: createWrapper(history),
    });
    await act(async () => {});
    expect(result.current[0]).toEqual(CUSTOM_RANGE);
    expect(history.index).toBe(0);

    await act(async () => {
      result.current[1]({ from: 'now-1h', to: 'now' });
    });
    expect(result.current[0]).toEqual({ from: 'now-1h', to: 'now' });
    expect(history.index).toBe(1);

    /* The initial entry was seeded with the stored range on mount, so Back
     * returns to what the user was looking at, not the default. */
    await act(async () => {
      history.goBack();
    });
    expect(result.current[0]).toEqual(CUSTOM_RANGE);
  });
});
