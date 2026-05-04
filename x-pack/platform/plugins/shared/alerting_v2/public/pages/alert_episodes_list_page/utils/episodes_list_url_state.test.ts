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
  episodesFilterStatesEqual,
  EPISODES_LIST_APP_STATE_KEY,
  EPISODES_LIST_STATUS_URL_ALL,
  readEpisodesListAppStateFromUrlStorage,
} from './episodes_list_url_state';

async function createKbnTestUrlStorage(
  episodesListPayload?: unknown
): Promise<IKbnUrlStateStorage> {
  const storage = createKbnUrlStateStorage({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    useHash: false,
    useHashQuery: false,
  });
  if (episodesListPayload !== undefined) {
    await storage.set(
      '_a',
      { [EPISODES_LIST_APP_STATE_KEY]: episodesListPayload },
      { replace: true }
    );
  }
  return storage;
}

describe('episodes_list_url_state', () => {
  describe('readEpisodesListAppStateFromUrlStorage', () => {
    it('reads filter + time fields as expected from _a.episodesList', async () => {
      const storage = await createKbnTestUrlStorage({
        status: 'active',
        ruleId: 'r1',
        queryString: '  host  ',
        tags: ['a', 'b'],
        assigneeUid: 'u1',
        extra: 'ignored',
        timeFrom: 'now-7d',
        timeTo: 'now',
      });
      expect(readEpisodesListAppStateFromUrlStorage(storage)).toEqual({
        filterState: {
          status: 'active',
          ruleId: 'r1',
          queryString: 'host',
          tags: ['a', 'b'],
          assigneeUid: 'u1',
        },
        timeRange: { from: 'now-7d', to: 'now' },
      });
    });

    it('treats empty filter strings as absent', async () => {
      const storage = await createKbnTestUrlStorage({
        status: '',
        ruleId: '   ',
        queryString: '',
        tags: [],
        assigneeUid: '',
      });
      expect(readEpisodesListAppStateFromUrlStorage(storage).filterState).toEqual({
        status: 'active',
      });
    });

    it('maps "all" status to null', async () => {
      const storage = await createKbnTestUrlStorage({
        status: EPISODES_LIST_STATUS_URL_ALL,
      });
      expect(readEpisodesListAppStateFromUrlStorage(storage).filterState.status).toBeNull();
    });

    it('defaults status to active when _a is missing', async () => {
      const storage = await createKbnTestUrlStorage();
      expect(readEpisodesListAppStateFromUrlStorage(storage)).toEqual({
        filterState: { status: 'active' },
      });
    });
  });

  describe('episodesFilterStatesEqual', () => {
    it('treats missing and empty tags as different', () => {
      expect(episodesFilterStatesEqual({}, { tags: [] })).toBe(false);
      expect(episodesFilterStatesEqual({ tags: [] }, { tags: [] })).toBe(true);
    });

    it('treats null and undefined status as equal', () => {
      expect(episodesFilterStatesEqual({ status: null }, { status: undefined })).toBe(true);
    });
  });
});
