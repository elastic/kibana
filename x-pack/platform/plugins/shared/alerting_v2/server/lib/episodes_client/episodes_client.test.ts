/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type {
  EpisodeActionRow,
  EpisodeDataEsqlRow,
  EpisodeEventRow,
  EpisodeEventsEsqlRow,
  SeriesSnoozeEsqlRow,
} from '@kbn/alerting-v2-common-queries';
import { EPISODE_DATA_FILTER } from '@kbn/alerting-v2-common-queries';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { EpisodesClient } from './episodes_client';

const SPACE_ID = 'space-a';
const EPISODE_ID = 'episode-1';
const GROUP_HASH = 'group-1';
const SERIES_ID = 'series-1';

const createRow = (overrides: Partial<EpisodeEventsEsqlRow> = {}): EpisodeEventsEsqlRow => ({
  '@timestamp': '2026-08-03T00:00:10.000Z',
  'episode.id': EPISODE_ID,
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: GROUP_HASH,
  series_id: SERIES_ID,
  first_timestamp: '2026-08-03T00:00:00.000Z',
  last_timestamp: '2026-08-03T00:00:10.000Z',
  duration: 10_000,
  ...overrides,
});

const createActionRow = (overrides: Partial<EpisodeActionRow> = {}): EpisodeActionRow => ({
  alert_id: EPISODE_ID,
  rule_id: 'rule-1',
  group_hash: GROUP_HASH,
  last_ack_action: null,
  last_assignee_uid: null,
  last_ack_actor: null,
  last_deactivate_action: null,
  last_deactivate_actor: null,
  last_tags: null,
  ...overrides,
});

interface CreateClientOptions {
  episodeRows?: EpisodeEventsEsqlRow[];
  dataRows?: EpisodeDataEsqlRow[];
  actionRows?: EpisodeActionRow[];
  snoozeRows?: SeriesSnoozeEsqlRow[];
}

const createClient = ({
  episodeRows = [],
  dataRows = [],
  actionRows = [],
  snoozeRows = [],
}: CreateClientOptions = {}) => {
  // Answers by query shape, since the first two queries run in parallel.
  const executeQueryRows = jest.fn(async ({ query }: { query: string; filter?: unknown }) => {
    if (query.includes('STATS last_snooze_action')) return snoozeRows;
    if (query.includes('alert_id IN')) return actionRows;
    if (query.includes('JSON_EXTRACT')) return dataRows;
    return episodeRows;
  });
  const queryService = { executeQueryRows };

  const client = new EpisodesClient(queryService as unknown as QueryServiceContract, SPACE_ID);

  return { client, queryService };
};

const getQueries = (queryService: ReturnType<typeof createClient>['queryService']) =>
  queryService.executeQueryRows.mock.calls.map(([{ query }]) => query);

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

    it('reads the episode from the rule events filtered by episode id', async () => {
      const { client, queryService } = createClient({ episodeRows: [createRow()] });

      await client.get(EPISODE_ID);

      const [episodeQuery] = getQueries(queryService);
      expect(episodeQuery).toContain(`episode.id == "${EPISODE_ID}"`);
      expect(episodeQuery).not.toContain('.alert-actions');
    });

    it('adds the episode actions and the series snooze state', async () => {
      const { client, queryService } = createClient({
        episodeRows: [createRow()],
        actionRows: [
          createActionRow({
            last_ack_action: 'ack',
            last_assignee_uid: 'user-1',
            last_tags: ['a', 'b'],
          }),
        ],
        snoozeRows: [{ last_snooze_action: 'snooze', snoozed_until: '2026-08-04T00:00:00.000Z' }],
      });

      await expect(client.get(EPISODE_ID)).resolves.toMatchObject({
        last_ack_action: 'ack',
        last_assignee_uid: 'user-1',
        last_tags: ['a', 'b'],
        last_snooze_action: 'snooze',
        snoozed_until: '2026-08-04T00:00:00.000Z',
      });

      const [, , actionsQuery, snoozeQuery] = getQueries(queryService);
      expect(actionsQuery).toContain(`alert_id IN ("${EPISODE_ID}")`);
      expect(snoozeQuery).toContain(`group_hash == "${GROUP_HASH}"`);
      expect(snoozeQuery).toContain(`series_id == "${SERIES_ID}"`);
    });

    it('adds the latest event data, looked up with the data filter', async () => {
      const { client, queryService } = createClient({
        episodeRows: [createRow()],
        dataRows: [{ '@timestamp': '2026-08-03T00:00:10.000Z', episode_data: '{"host":"web-01"}' }],
      });

      await expect(client.get(EPISODE_ID)).resolves.toMatchObject({
        episode_data: '{"host":"web-01"}',
      });

      const dataCall = queryService.executeQueryRows.mock.calls.find(([{ query }]) =>
        query.includes('JSON_EXTRACT')
      );
      expect(dataCall?.[0]).toMatchObject({ filter: EPISODE_DATA_FILTER });
    });

    it('returns empty action columns when the episode has no actions', async () => {
      const { client } = createClient({ episodeRows: [createRow()] });

      await expect(client.get(EPISODE_ID)).resolves.toMatchObject({
        episode_data: null,
        last_ack_action: null,
        last_assignee_uid: null,
        last_tags: [],
        last_snooze_action: null,
        snoozed_until: null,
      });
    });

    it('returns undefined without the snooze lookup when the episode does not exist', async () => {
      const { client, queryService } = createClient({ episodeRows: [] });

      await expect(client.get(EPISODE_ID)).resolves.toBeUndefined();
      expect(getQueries(queryService).some((q) => q.includes('last_snooze_action'))).toBe(false);
    });

    it('normalizes a single-value last_tags into an array', async () => {
      const { client } = createClient({
        episodeRows: [createRow()],
        actionRows: [createActionRow({ last_tags: 'urgent' })],
      });

      await expect(client.get(EPISODE_ID)).resolves.toMatchObject({ last_tags: ['urgent'] });
    });
  });

  describe('getEvents', () => {
    const eventRow: EpisodeEventRow = {
      '@timestamp': '2026-08-03T00:00:00.000Z',
      'episode.id': EPISODE_ID,
      'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
      'rule.id': 'rule-1',
      group_hash: GROUP_HASH,
      severity: 'high',
      source: 'threshold',
      data: { cpu: 90 },
    };

    it('returns event rows from the shared episode events query', async () => {
      const queryService: jest.Mocked<Pick<QueryServiceContract, 'executeQueryRows'>> = {
        executeQueryRows: jest.fn().mockResolvedValueOnce([eventRow]),
      };
      const client = new EpisodesClient(queryService as unknown as QueryServiceContract, SPACE_ID);

      await expect(client.getEvents(EPISODE_ID)).resolves.toEqual([eventRow]);

      expect(queryService.executeQueryRows).toHaveBeenCalledTimes(1);
      const [{ query }] = queryService.executeQueryRows.mock.calls[0];
      expect(query).toContain(`space_id == "${SPACE_ID}"`);
      expect(query).toContain(`episode.id == "${EPISODE_ID}"`);
      expect(query).toContain('type == "alert"');
      expect(query).toContain(
        'KEEP @timestamp, `episode.id`, `episode.status`, `rule.id`, group_hash, severity, source, data'
      );
      expect(query).toContain('SORT @timestamp ASC');
    });

    it('forwards time-range, status, and limit filters to the shared query', async () => {
      const queryService: jest.Mocked<Pick<QueryServiceContract, 'executeQueryRows'>> = {
        executeQueryRows: jest.fn().mockResolvedValueOnce([]),
      };
      const client = new EpisodesClient(queryService as unknown as QueryServiceContract, SPACE_ID);

      await client.getEvents(EPISODE_ID, {
        timeRange: {
          start: '2026-08-03T00:00:00.000Z',
          end: '2026-08-03T01:00:00.000Z',
        },
        status: ALERT_EPISODE_STATUS.ACTIVE,
        limit: 1001,
      });

      const [{ query }] = queryService.executeQueryRows.mock.calls[0];
      expect(query).toContain('@timestamp >= "2026-08-03T00:00:00.000Z"');
      expect(query).toContain('@timestamp <= "2026-08-03T01:00:00.000Z"');
      expect(query).toContain(`episode.status == "${ALERT_EPISODE_STATUS.ACTIVE}"`);
      expect(query).toContain('LIMIT 1001');
    });
  });
});
