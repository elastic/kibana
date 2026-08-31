/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createMemoryHistory } from 'history';
import {
  DEFAULT_EPISODES_TABLE_CONFIG,
  EPISODES_TABLE_APP_STATE_KEY,
  EPISODES_TABLE_CONFIG_STORAGE_KEY,
  mergeEpisodesTableConfig,
  readEpisodesTableConfigFromStorage,
  readEpisodesTableConfigFromUrl,
  writeEpisodesTableConfigToStorage,
  writeEpisodesTableConfigToUrl,
} from './episodes_table_config';

const createMockStorage = (initialValue: unknown = null) => ({
  get: jest.fn().mockReturnValue(initialValue),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

const createKbnTestUrlStorage = async (
  episodesTablePayload?: unknown
): Promise<IKbnUrlStateStorage> => {
  const storage = createKbnUrlStateStorage({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    useHash: false,
    useHashQuery: false,
  });
  if (episodesTablePayload !== undefined) {
    await storage.set(
      '_a',
      { [EPISODES_TABLE_APP_STATE_KEY]: episodesTablePayload },
      { replace: true }
    );
  }
  return storage;
};

describe('episodes_table_config', () => {
  describe('mergeEpisodesTableConfig', () => {
    it('returns defaults when both inputs are undefined', () => {
      expect(mergeEpisodesTableConfig()).toEqual(DEFAULT_EPISODES_TABLE_CONFIG);
    });

    it('applies localStorage over defaults', () => {
      const fromStorage = { rowHeight: -1 };
      const result = mergeEpisodesTableConfig(fromStorage);
      expect(result.rowHeight).toBe(-1);
      expect(result.visibleColumns).toEqual(DEFAULT_EPISODES_TABLE_CONFIG.visibleColumns);
    });

    it('URL wins over localStorage per field', () => {
      const fromStorage = {
        rowHeight: -1,
        sort: { sortField: 'duration', sortDirection: 'asc' as const },
      };
      const fromUrl = { rowHeight: 1 };
      const result = mergeEpisodesTableConfig(fromStorage, fromUrl);
      // URL's rowHeight beats LS
      expect(result.rowHeight).toBe(1);
      // LS sort is preserved (URL didn't specify sort)
      expect(result.sort).toEqual({ sortField: 'duration', sortDirection: 'asc' });
    });

    it('URL fully overrides LS when it specifies the same field', () => {
      const fromStorage = { visibleColumns: ['rule.id', 'severity'] };
      const fromUrl = { visibleColumns: ['episode.status', 'tags'] };
      const result = mergeEpisodesTableConfig(fromStorage, fromUrl);
      expect(result.visibleColumns).toEqual(['episode.status', 'tags']);
    });

    it('ignores null/undefined inputs gracefully', () => {
      expect(mergeEpisodesTableConfig(null, null)).toEqual(DEFAULT_EPISODES_TABLE_CONFIG);
      expect(mergeEpisodesTableConfig(undefined, undefined)).toEqual(DEFAULT_EPISODES_TABLE_CONFIG);
    });
  });

  describe('readEpisodesTableConfigFromStorage / writeEpisodesTableConfigToStorage', () => {
    it('returns undefined when storage has no saved value', () => {
      const storage = createMockStorage(null);
      expect(readEpisodesTableConfigFromStorage(storage as any)).toBeUndefined();
    });

    it('returns decoded config when storage has a valid value', () => {
      const stored = {
        visibleColumns: ['episode.status', 'severity'],
        sort: { sortField: 'duration', sortDirection: 'desc' },
        rowHeight: -1,
        columnSettings: { duration: { width: 200 } },
      };
      const storage = createMockStorage(stored);
      expect(readEpisodesTableConfigFromStorage(storage as any)).toEqual(stored);
    });

    it('writes only non-default fields to localStorage at the expected key', () => {
      const storage = createMockStorage();
      writeEpisodesTableConfigToStorage(storage as any, {
        ...DEFAULT_EPISODES_TABLE_CONFIG,
        rowHeight: -1,
      });
      expect(storage.set).toHaveBeenCalledWith(EPISODES_TABLE_CONFIG_STORAGE_KEY, {
        rowHeight: -1,
      });
    });

    it('removes the storage key when the config equals defaults', () => {
      const storage = createMockStorage();
      writeEpisodesTableConfigToStorage(storage as any, DEFAULT_EPISODES_TABLE_CONFIG);
      expect(storage.set).not.toHaveBeenCalled();
      expect(storage.remove).toHaveBeenCalledWith(EPISODES_TABLE_CONFIG_STORAGE_KEY);
    });

    it('round-trips config through storage', () => {
      let stored: unknown = null;
      const storage = {
        get: jest.fn(() => stored),
        set: jest.fn((_, v) => {
          stored = v;
        }),
        remove: jest.fn(),
        clear: jest.fn(),
      };
      const config = {
        ...DEFAULT_EPISODES_TABLE_CONFIG,
        rowHeight: -1,
        sort: { sortField: 'tags', sortDirection: 'asc' as const },
      };
      writeEpisodesTableConfigToStorage(storage as any, config);
      // Only the fields that diverge from the default are persisted (and read back); the caller
      // is expected to re-merge with defaults via mergeEpisodesTableConfig.
      expect(readEpisodesTableConfigFromStorage(storage as any)).toEqual({
        rowHeight: -1,
        sort: { sortField: 'tags', sortDirection: 'asc' },
      });
    });

    it('ignores invalid storage values gracefully', () => {
      const storage = createMockStorage('not-an-object');
      expect(readEpisodesTableConfigFromStorage(storage as any)).toBeUndefined();
    });

    it('ignores invalid rowHeight values', () => {
      const storage = createMockStorage({ rowHeight: 'not-a-number' });
      expect(readEpisodesTableConfigFromStorage(storage as any)).toBeUndefined();
    });

    it('ignores out-of-range and non-integer rowHeight values', () => {
      for (const rowHeight of [99999, -2, 21, 1.5, NaN, Infinity]) {
        const storage = createMockStorage({ rowHeight });
        expect(readEpisodesTableConfigFromStorage(storage as any)).toBeUndefined();
      }
    });

    it('accepts in-range rowHeight values (auto, single, and custom line counts)', () => {
      for (const rowHeight of [-1, 1, 20]) {
        const storage = createMockStorage({ rowHeight });
        expect(readEpisodesTableConfigFromStorage(storage as any)).toEqual({ rowHeight });
      }
    });
  });

  describe('readEpisodesTableConfigFromUrl', () => {
    it('returns undefined when _a has no episodesTable sub-key', async () => {
      const urlStorage = await createKbnTestUrlStorage();
      expect(readEpisodesTableConfigFromUrl(urlStorage)).toBeUndefined();
    });

    it('reads visibleColumns from URL', async () => {
      const urlStorage = await createKbnTestUrlStorage({
        visibleColumns: ['episode.status', 'tags'],
      });
      const result = readEpisodesTableConfigFromUrl(urlStorage);
      expect(result?.visibleColumns).toEqual(['episode.status', 'tags']);
    });

    it('reads sort from URL', async () => {
      const urlStorage = await createKbnTestUrlStorage({
        sort: { sortField: 'duration', sortDirection: 'asc' },
      });
      const result = readEpisodesTableConfigFromUrl(urlStorage);
      expect(result?.sort).toEqual({ sortField: 'duration', sortDirection: 'asc' });
    });

    it('reads rowHeight from URL', async () => {
      const urlStorage = await createKbnTestUrlStorage({ rowHeight: -1 });
      const result = readEpisodesTableConfigFromUrl(urlStorage);
      expect(result?.rowHeight).toBe(-1);
    });

    it('reads columnSettings (column widths) from URL', async () => {
      const urlStorage = await createKbnTestUrlStorage({
        columnSettings: { duration: { width: 200 }, tags: { width: 150 } },
      });
      const result = readEpisodesTableConfigFromUrl(urlStorage);
      expect(result?.columnSettings).toEqual({
        duration: { width: 200 },
        tags: { width: 150 },
      });
    });

    it('ignores invalid sort direction', async () => {
      const urlStorage = await createKbnTestUrlStorage({
        sort: { sortField: 'tags', sortDirection: 'invalid' },
      });
      expect(readEpisodesTableConfigFromUrl(urlStorage)?.sort).toBeUndefined();
    });

    it('ignores empty visibleColumns arrays', async () => {
      const urlStorage = await createKbnTestUrlStorage({ visibleColumns: [] });
      expect(readEpisodesTableConfigFromUrl(urlStorage)?.visibleColumns).toBeUndefined();
    });
  });

  describe('writeEpisodesTableConfigToUrl', () => {
    it('omits episodesTable sub-key when config equals defaults', async () => {
      const urlStorage = await createKbnTestUrlStorage({ rowHeight: 1 });
      await writeEpisodesTableConfigToUrl(urlStorage, DEFAULT_EPISODES_TABLE_CONFIG);
      expect(urlStorage.get('_a')).toEqual({});
    });

    it('writes non-default fields to _a.episodesTable', async () => {
      const urlStorage = await createKbnTestUrlStorage();
      await writeEpisodesTableConfigToUrl(urlStorage, {
        ...DEFAULT_EPISODES_TABLE_CONFIG,
        rowHeight: -1,
      });
      expect(urlStorage.get('_a')).toEqual({
        [EPISODES_TABLE_APP_STATE_KEY]: { rowHeight: -1 },
      });
    });

    it('preserves other _a sub-keys (e.g. episodesList) when writing', async () => {
      const urlStorage = createKbnUrlStateStorage({
        history: createMemoryHistory({ initialEntries: ['/'] }),
        useHash: false,
        useHashQuery: false,
      });
      await urlStorage.set('_a', { episodesList: { status: 'recovering' } }, { replace: true });

      await writeEpisodesTableConfigToUrl(urlStorage, {
        ...DEFAULT_EPISODES_TABLE_CONFIG,
        rowHeight: -1,
      });

      expect(urlStorage.get('_a')).toEqual({
        episodesList: { status: 'recovering' },
        [EPISODES_TABLE_APP_STATE_KEY]: { rowHeight: -1 },
      });
    });

    it('round-trips config through URL', async () => {
      const urlStorage = await createKbnTestUrlStorage();
      const config = {
        ...DEFAULT_EPISODES_TABLE_CONFIG,
        visibleColumns: ['episode.status', 'tags'],
        sort: { sortField: 'duration', sortDirection: 'desc' as const },
        rowHeight: -1,
        columnSettings: { duration: { width: 250 } },
      };
      await writeEpisodesTableConfigToUrl(urlStorage, config);
      const result = readEpisodesTableConfigFromUrl(urlStorage);
      expect(result).toEqual({
        visibleColumns: ['episode.status', 'tags'],
        sort: { sortField: 'duration', sortDirection: 'desc' },
        rowHeight: -1,
        columnSettings: { duration: { width: 250 } },
      });
    });
  });
});
