/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { IKbnUrlStateStorage, Storage } from '@kbn/kibana-utils-plugin/public';
import { createMemoryHistory } from 'history';
import { DEFAULT_ACTIVITY_TIME_RANGE } from './time_range';
import {
  ACTIVITY_TIME_RANGE_APP_STATE_KEY,
  ACTIVITY_TIME_RANGE_STORAGE_KEY,
  decodeActivityTimeRange,
  readActivityTimeRangeFromStorage,
  readActivityTimeRangeFromUrl,
  resolveActivityTimeRange,
  writeActivityTimeRangeToStorage,
  writeActivityTimeRangeToUrl,
} from './activity_time_range_state';

const CUSTOM_RANGE = { from: 'now-7d', to: 'now' };

const createMockStorage = (initialValue: unknown = null): Storage =>
  ({
    get: jest.fn().mockReturnValue(initialValue),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  } as unknown as Storage);

const createKbnTestUrlStorage = async (
  activityTimeRangePayload?: unknown,
  extraAppState?: Record<string, unknown>
): Promise<IKbnUrlStateStorage> => {
  const storage = createKbnUrlStateStorage({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    useHash: false,
    useHashQuery: false,
  });
  if (activityTimeRangePayload !== undefined || extraAppState !== undefined) {
    await storage.set(
      '_a',
      {
        ...(extraAppState ?? {}),
        ...(activityTimeRangePayload !== undefined
          ? { [ACTIVITY_TIME_RANGE_APP_STATE_KEY]: activityTimeRangePayload }
          : {}),
      },
      { replace: true }
    );
  }
  return storage;
};

describe('activity_time_range_state', () => {
  describe('decodeActivityTimeRange', () => {
    it('accepts a valid relative range', () => {
      expect(decodeActivityTimeRange(CUSTOM_RANGE)).toEqual(CUSTOM_RANGE);
    });

    it('accepts a valid absolute range', () => {
      const range = {
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-08T00:00:00.000Z',
      };
      expect(decodeActivityTimeRange(range)).toEqual(range);
    });

    it('strips unknown keys from an otherwise valid range', () => {
      expect(decodeActivityTimeRange({ ...CUSTOM_RANGE, extra: true })).toEqual(CUSTOM_RANGE);
    });

    it('rejects missing keys', () => {
      expect(decodeActivityTimeRange({ from: 'now-7d' })).toBeUndefined();
      expect(decodeActivityTimeRange({ to: 'now' })).toBeUndefined();
      expect(decodeActivityTimeRange(null)).toBeUndefined();
      expect(decodeActivityTimeRange('now-7d')).toBeUndefined();
    });

    it('rejects empty and over-long strings', () => {
      expect(decodeActivityTimeRange({ from: '', to: 'now' })).toBeUndefined();
      expect(decodeActivityTimeRange({ from: 'a'.repeat(129), to: 'now' })).toBeUndefined();
    });

    it('rejects unparseable datemath', () => {
      // ISO-shaped but out of range — datemath.parse yields NaN rather than throwing.
      expect(
        decodeActivityTimeRange({ from: '2026-13-45T00:00:00.000Z', to: 'now' })
      ).toBeUndefined();
    });

    it('rejects a range whose start is after its end', () => {
      expect(decodeActivityTimeRange({ from: 'now', to: 'now-1h' })).toBeUndefined();
    });
  });

  describe('resolveActivityTimeRange', () => {
    it('returns the fallback when both inputs are empty', () => {
      expect(resolveActivityTimeRange()).toEqual(DEFAULT_ACTIVITY_TIME_RANGE);
    });

    it('uses localStorage when the URL is empty', () => {
      expect(resolveActivityTimeRange(CUSTOM_RANGE)).toEqual(CUSTOM_RANGE);
    });

    it('lets the URL win over localStorage', () => {
      expect(resolveActivityTimeRange(CUSTOM_RANGE, { from: 'now-1h', to: 'now' })).toEqual({
        from: 'now-1h',
        to: 'now',
      });
    });
  });

  describe('read/write localStorage', () => {
    it('returns undefined when storage has no saved value', () => {
      expect(readActivityTimeRangeFromStorage(createMockStorage(null))).toBeUndefined();
    });

    it('returns a decoded range when storage has a valid value', () => {
      expect(readActivityTimeRangeFromStorage(createMockStorage(CUSTOM_RANGE))).toEqual(
        CUSTOM_RANGE
      );
    });

    it('writes the range at the expected key', () => {
      const storage = createMockStorage();
      writeActivityTimeRangeToStorage(storage, CUSTOM_RANGE);
      expect(storage.set).toHaveBeenCalledWith(ACTIVITY_TIME_RANGE_STORAGE_KEY, CUSTOM_RANGE);
    });

    it('persists an explicitly selected default rather than clearing', () => {
      const storage = createMockStorage();
      writeActivityTimeRangeToStorage(storage, DEFAULT_ACTIVITY_TIME_RANGE);
      expect(storage.set).toHaveBeenCalledWith(
        ACTIVITY_TIME_RANGE_STORAGE_KEY,
        DEFAULT_ACTIVITY_TIME_RANGE
      );
      expect(storage.remove).not.toHaveBeenCalled();
    });

    it('ignores invalid storage values', () => {
      expect(readActivityTimeRangeFromStorage(createMockStorage('not-an-object'))).toBeUndefined();
    });
  });

  describe('read/write URL', () => {
    it('returns undefined when _a has no activityTimeRange', async () => {
      const urlStorage = await createKbnTestUrlStorage();
      expect(readActivityTimeRangeFromUrl(urlStorage)).toBeUndefined();
    });

    it('reads a valid range from the URL', async () => {
      const urlStorage = await createKbnTestUrlStorage(CUSTOM_RANGE);
      expect(readActivityTimeRangeFromUrl(urlStorage)).toEqual(CUSTOM_RANGE);
    });

    it('writes an explicitly selected default to _a.activityTimeRange', async () => {
      const urlStorage = await createKbnTestUrlStorage(CUSTOM_RANGE);
      await writeActivityTimeRangeToUrl(urlStorage, DEFAULT_ACTIVITY_TIME_RANGE);
      expect(urlStorage.get('_a')).toEqual({
        [ACTIVITY_TIME_RANGE_APP_STATE_KEY]: DEFAULT_ACTIVITY_TIME_RANGE,
      });
    });

    it('writes a non-default range to _a.activityTimeRange', async () => {
      const urlStorage = await createKbnTestUrlStorage();
      await writeActivityTimeRangeToUrl(urlStorage, CUSTOM_RANGE);
      expect(urlStorage.get('_a')).toEqual({
        [ACTIVITY_TIME_RANGE_APP_STATE_KEY]: CUSTOM_RANGE,
      });
    });

    it('preserves other _a sub-keys when writing', async () => {
      const urlStorage = await createKbnTestUrlStorage(undefined, {
        episodesList: { status: 'recovering' },
      });
      await writeActivityTimeRangeToUrl(urlStorage, CUSTOM_RANGE);
      expect(urlStorage.get('_a')).toEqual({
        episodesList: { status: 'recovering' },
        [ACTIVITY_TIME_RANGE_APP_STATE_KEY]: CUSTOM_RANGE,
      });
    });
  });
});
