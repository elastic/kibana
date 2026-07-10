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
  it('returns defaults when no URL or LS state is set', () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createMockStorage(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesTableConfig(mockStorage as any), { wrapper });

    expect(result.current.visibleColumns).toEqual(DEFAULT_EPISODES_TABLE_CONFIG.visibleColumns);
    expect(result.current.sort).toEqual(DEFAULT_EPISODES_TABLE_CONFIG.sort);
    expect(result.current.rowHeight).toBe(DEFAULT_EPISODES_TABLE_CONFIG.rowHeight);
    expect(result.current.columnSettings).toEqual(DEFAULT_EPISODES_TABLE_CONFIG.columnSettings);
  });

  it('seeds state from localStorage', () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createMockStorage({
      ...DEFAULT_EPISODES_TABLE_CONFIG,
      rowHeight: -1,
    });

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

    // LS says rowHeight = -1 (auto)
    const mockStorage = createMockStorage({
      ...DEFAULT_EPISODES_TABLE_CONFIG,
      rowHeight: -1,
    });

    // URL says rowHeight = 1 (single)
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

    // URL value wins
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

  it('setVisibleColumns updates state and writes to both stores', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createMockStorage(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesTableConfig(mockStorage as any), { wrapper });

    await act(async () => {
      result.current.setVisibleColumns(['episode.status', 'tags']);
    });

    expect(result.current.visibleColumns).toEqual(['episode.status', 'tags']);
    expect(mockStorage.set).toHaveBeenCalledWith(
      EPISODES_TABLE_CONFIG_STORAGE_KEY,
      expect.objectContaining({ visibleColumns: ['episode.status', 'tags'] })
    );
    expect(history.location.search).toContain('_a=');
  });

  it('setSort updates state and writes to both stores', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createMockStorage(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesTableConfig(mockStorage as any), { wrapper });

    await act(async () => {
      result.current.setSort({ sortField: 'duration', sortDirection: 'asc' });
    });

    expect(result.current.sort).toEqual({ sortField: 'duration', sortDirection: 'asc' });
    expect(mockStorage.set).toHaveBeenCalledWith(
      EPISODES_TABLE_CONFIG_STORAGE_KEY,
      expect.objectContaining({ sort: { sortField: 'duration', sortDirection: 'asc' } })
    );
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
    expect(mockStorage.set).toHaveBeenCalledWith(
      EPISODES_TABLE_CONFIG_STORAGE_KEY,
      expect.objectContaining({ rowHeight: -1 })
    );
  });

  it('onResize merges the new column width into columnSettings', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const mockStorage = createMockStorage(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesTableConfig(mockStorage as any), { wrapper });

    await act(async () => {
      result.current.onResize({ columnId: 'rule.id', width: 300 });
    });

    expect(result.current.columnSettings['rule.id']?.width).toBe(300);
    // Other default column widths are preserved
    expect(result.current.columnSettings.duration?.width).toBe(110);
    expect(mockStorage.set).toHaveBeenCalledWith(
      EPISODES_TABLE_CONFIG_STORAGE_KEY,
      expect.objectContaining({
        columnSettings: expect.objectContaining({ 'rule.id': { width: 300 } }),
      })
    );
  });

  it('resetToDefaults restores default config and writes to both stores', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    // Stateful, unlike createMockStorage: the reset triggers a URL write (via history.replace),
    // which re-triggers the hook's location.search re-sync effect and re-reads storage — a static
    // mock would then hand back the stale pre-reset value.
    let stored: unknown = { ...DEFAULT_EPISODES_TABLE_CONFIG, rowHeight: -1 };
    const mockStorage = {
      get: jest.fn(() => stored),
      set: jest.fn((_, v) => {
        stored = v;
      }),
      remove: jest.fn(() => {
        stored = null;
      }),
      clear: jest.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesTableConfig(mockStorage as any), { wrapper });

    expect(result.current.rowHeight).toBe(-1);

    await act(async () => {
      result.current.resetToDefaults();
    });

    expect(result.current.rowHeight).toBe(DEFAULT_EPISODES_TABLE_CONFIG.rowHeight);
    // Encoding strips fields that equal the default, so an all-default config clears the key.
    expect(mockStorage.remove).toHaveBeenCalledWith(EPISODES_TABLE_CONFIG_STORAGE_KEY);
  });
});
