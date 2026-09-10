/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type {
  AlertEpisodeEsqlRow,
  EpisodeGroupHashEsqlRow,
  EpisodeTransitionEsqlRow,
} from '@kbn/alerting-v2-common-queries';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { EpisodesClient } from './episodes_client';

const SPACE_ID = 'space-a';
const EPISODE_ID = 'episode-1';
const GROUP_HASH = 'group-1';

const createRow = (overrides: Partial<AlertEpisodeEsqlRow> = {}): AlertEpisodeEsqlRow => ({
  '@timestamp': '2026-08-03T00:00:10.000Z',
  'episode.id': EPISODE_ID,
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: GROUP_HASH,
  first_timestamp: '2026-08-03T00:00:00.000Z',
  last_timestamp: '2026-08-03T00:00:10.000Z',
  duration: 10_000,
  ...overrides,
});

interface CreateClientOptions {
  lookupRows?: EpisodeGroupHashEsqlRow[];
  episodeRows?: AlertEpisodeEsqlRow[];
}

const createClient = ({
  lookupRows = [{ group_hash: GROUP_HASH }],
  episodeRows = [],
}: CreateClientOptions = {}) => {
  const queryService: jest.Mocked<Pick<QueryServiceContract, 'executeQueryRows'>> = {
    executeQueryRows: jest
      .fn()
      .mockResolvedValueOnce(lookupRows)
      .mockResolvedValueOnce(episodeRows),
  };

  const client = new EpisodesClient(queryService as unknown as QueryServiceContract, SPACE_ID);

  return { client, queryService };
};

describe('EpisodesClient', () => {
  describe('get', () => {
    it('returns the episode row', async () => {
      const { client } = createClient({ episodeRows: [createRow()] });

      await expect(client.get(EPISODE_ID)).resolves.toMatchObject({
        'episode.id': EPISODE_ID,
        'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
        'rule.id': 'rule-1',
        duration: 10_000,
      });
    });

    it('narrows the episode query to the resolved group hash', async () => {
      const { client, queryService } = createClient({ episodeRows: [createRow()] });

      await client.get(EPISODE_ID);

      expect(queryService.executeQueryRows).toHaveBeenCalledTimes(2);
      const [, [episodeQuery]] = queryService.executeQueryRows.mock.calls;
      expect(episodeQuery.query).toContain(`group_hash == "${GROUP_HASH}"`);
      expect(episodeQuery.query).toContain(`episode.id == "${EPISODE_ID}"`);
    });

    it('skips the episode query when no rule event carries the episode id', async () => {
      const { client, queryService } = createClient({ lookupRows: [] });

      await expect(client.get(EPISODE_ID)).resolves.toBeUndefined();
      expect(queryService.executeQueryRows).toHaveBeenCalledTimes(1);
    });

    it('returns undefined when the episode does not exist', async () => {
      const { client } = createClient({ episodeRows: [] });

      await expect(client.get(EPISODE_ID)).resolves.toBeUndefined();
    });

    it('normalizes a single-value last_tags into an array', async () => {
      const { client } = createClient({ episodeRows: [createRow({ last_tags: 'urgent' })] });

      await expect(client.get(EPISODE_ID)).resolves.toMatchObject({ last_tags: ['urgent'] });
    });

    it('normalizes an absent last_tags into an empty array', async () => {
      const { client } = createClient({ episodeRows: [createRow({ last_tags: null })] });

      await expect(client.get(EPISODE_ID)).resolves.toMatchObject({ last_tags: [] });
    });
  });

  describe('getEpisodeTransitions', () => {
    const createTransition = (
      overrides: Partial<EpisodeTransitionEsqlRow> = {}
    ): EpisodeTransitionEsqlRow => ({
      'episode.id': EPISODE_ID,
      'rule.id': 'rule-1',
      group_hash: GROUP_HASH,
      status_started_at: '2026-08-03T00:00:00.000Z',
      previous_status: null,
      episode_status: ALERT_EPISODE_STATUS.ACTIVE,
      duration_ms: 10_000,
      status_ended_at: '2026-08-03T00:00:10.000Z',
      data: { host: 'web-01' },
      ...overrides,
    });

    it('returns transition rows for the episode', async () => {
      const rows = [
        createTransition(),
        createTransition({
          previous_status: ALERT_EPISODE_STATUS.ACTIVE,
          episode_status: ALERT_EPISODE_STATUS.INACTIVE,
          status_started_at: '2026-08-03T00:00:10.000Z',
          status_ended_at: null,
          duration_ms: 0,
        }),
      ];
      const queryService: jest.Mocked<Pick<QueryServiceContract, 'executeQueryRows'>> = {
        executeQueryRows: jest.fn().mockResolvedValue(rows),
      };
      const client = new EpisodesClient(queryService as unknown as QueryServiceContract, SPACE_ID);

      await expect(client.getEpisodeTransitions(EPISODE_ID)).resolves.toEqual(rows);
    });

    it('filters the transitions query by space and episode id', async () => {
      const queryService: jest.Mocked<Pick<QueryServiceContract, 'executeQueryRows'>> = {
        executeQueryRows: jest.fn().mockResolvedValue([]),
      };
      const client = new EpisodesClient(queryService as unknown as QueryServiceContract, SPACE_ID);

      await client.getEpisodeTransitions(EPISODE_ID);

      expect(queryService.executeQueryRows).toHaveBeenCalledTimes(1);
      const [{ query }] = queryService.executeQueryRows.mock.calls[0];
      expect(query).toContain(`space_id == "${SPACE_ID}"`);
      expect(query).toContain(`episode.id == "${EPISODE_ID}"`);
      expect(query).toContain('DATE_DIFF("ms"');
    });

    it('returns an empty list when the episode has no status-bearing events', async () => {
      const queryService: jest.Mocked<Pick<QueryServiceContract, 'executeQueryRows'>> = {
        executeQueryRows: jest.fn().mockResolvedValue([]),
      };
      const client = new EpisodesClient(queryService as unknown as QueryServiceContract, SPACE_ID);

      await expect(client.getEpisodeTransitions(EPISODE_ID)).resolves.toEqual([]);
    });
  });
});
