/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import {
  DEFAULT_EPISODES_TABLE_CONFIG,
  EPISODES_TABLE_APP_STATE_KEY,
  EPISODES_TABLE_CONFIG_STORAGE_KEY,
} from '../utils/episodes_table_config';
import { useEpisodesTableConfig } from './use_episodes_table_config';

const createMockStorage = (initialValue: unknown = null) => ({
  get: jest.fn().mockReturnValue(initialValue),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

describe('useEpisodesTableConfig', () => {
  it('returns the default row height when no URL or LS state is set', () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createMockStorage(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesTableConfig(mockStorage as any), { wrapper });

    expect(result.current.rowHeight).toBe(DEFAULT_EPISODES_TABLE_CONFIG.rowHeight);
  });

  it('seeds state from localStorage', () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createMockStorage({ rowHeight: -1 });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesTableConfig(mockStorage as any), { wrapper });

    expect(result.current.rowHeight).toBe(-1);
    expect(mockStorage.get).toHaveBeenCalledWith(EPISODES_TABLE_CONFIG_STORAGE_KEY);
  });

  it('URL wins over localStorage on mount', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const urlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    });

    const mockStorage = createMockStorage({ rowHeight: -1 });

    await act(async () => {
      await urlStateStorage.set(
        '_a',
        { [EPISODES_TABLE_APP_STATE_KEY]: { rowHeight: 1 } },
        { replace: true }
      );
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesTableConfig(mockStorage as any), { wrapper });

    expect(result.current.rowHeight).toBe(1);
  });

  it('re-syncs rowHeight from the URL on browser Back/Forward', async () => {
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
        { [EPISODES_TABLE_APP_STATE_KEY]: { rowHeight: -1 } },
        { replace: true }
      );
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesTableConfig(mockStorage as any), { wrapper });
    expect(result.current.rowHeight).toBe(-1);

    // Simulate a later navigation (e.g. a filter change) pushing a new history entry with a
    // different rowHeight snapshotted in the same `_a` blob.
    await act(async () => {
      await urlStateStorage.set(
        '_a',
        { [EPISODES_TABLE_APP_STATE_KEY]: { rowHeight: 5 } },
        { replace: false }
      );
    });
    expect(result.current.rowHeight).toBe(5);

    await act(async () => {
      history.goBack();
    });

    expect(result.current.rowHeight).toBe(-1);
  });

  it('setRowHeight updates state and writes to both stores', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createMockStorage(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesTableConfig(mockStorage as any), { wrapper });

    await act(async () => {
      result.current.setRowHeight(-1);
    });

    expect(result.current.rowHeight).toBe(-1);
    expect(mockStorage.set).toHaveBeenCalledWith(EPISODES_TABLE_CONFIG_STORAGE_KEY, {
      rowHeight: -1,
    });
    expect(history.location.search).toContain('_a=');
  });
});
