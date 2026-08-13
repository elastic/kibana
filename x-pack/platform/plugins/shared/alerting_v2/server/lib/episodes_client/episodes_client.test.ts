/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeEsqlRow } from '@kbn/alerting-v2-common-queries';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { EpisodesClient } from './episodes_client';

const SPACE_ID = 'space-a';
const EPISODE_ID = 'episode-1';

const createRow = (overrides: Partial<AlertEpisodeEsqlRow> = {}): AlertEpisodeEsqlRow => ({
  '@timestamp': '2026-08-03T00:00:10.000Z',
  'episode.id': EPISODE_ID,
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'group-1',
  first_timestamp: '2026-08-03T00:00:00.000Z',
  last_timestamp: '2026-08-03T00:00:10.000Z',
  duration: 10_000,
  ...overrides,
});

const createClient = (rows: AlertEpisodeEsqlRow[]) => {
  const queryService: jest.Mocked<Pick<QueryServiceContract, 'executeQueryRows'>> = {
    executeQueryRows: jest.fn().mockResolvedValue(rows),
  };

  const client = new EpisodesClient(queryService as unknown as QueryServiceContract, SPACE_ID);

  return { client, queryService };
};

describe('EpisodesClient', () => {
  describe('get', () => {
    it('returns the episode row', async () => {
      const { client } = createClient([createRow()]);

      await expect(client.get(EPISODE_ID)).resolves.toMatchObject({
        'episode.id': EPISODE_ID,
        'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
        'rule.id': 'rule-1',
        duration: 10_000,
      });
    });

    it('returns undefined when the episode does not exist', async () => {
      const { client } = createClient([]);

      await expect(client.get(EPISODE_ID)).resolves.toBeUndefined();
    });

    it('normalizes a single-value last_tags into an array', async () => {
      const { client } = createClient([createRow({ last_tags: 'urgent' })]);

      await expect(client.get(EPISODE_ID)).resolves.toMatchObject({ last_tags: ['urgent'] });
    });

    it('normalizes an absent last_tags into an empty array', async () => {
      const { client } = createClient([createRow({ last_tags: null })]);

      await expect(client.get(EPISODE_ID)).resolves.toMatchObject({ last_tags: [] });
    });
  });
});
