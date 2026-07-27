/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { BulkCreateAlertActionItemBody } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { ALERTING_V2_ERROR_CODES } from '../../errors/error_codes';
import { getAlertEventESQLResponse, getEmptyESQLResponse } from '../fixtures/query_responses';
import {
  bulkLoadLatestAlertEvents,
  loadLastAlertEventOrThrow,
  loadLatestAlertEvents,
} from './load_latest_alert_events';

describe('loadLastAlertEventOrThrow', () => {
  const SPACE_ID = 'default';
  const GROUP_HASH = 'test-group-hash';

  const setup = () => createQueryService();

  describe('happy path', () => {
    it('returns the projected `AlertEventRecord` shape on a non-empty response', async () => {
      const { queryService, mockEsClient } = setup();
      mockEsClient.esql.query.mockResolvedValueOnce(
        getAlertEventESQLResponse([
          {
            '@timestamp': '2025-06-01T12:00:00.000Z',
            group_hash: GROUP_HASH,
            episode_id: 'episode-42',
            episode_status: 'recovering',
            episode_status_count: 2,
            rule_id: 'rule-7',
            rule_version: 3,
            space_id: SPACE_ID,
            status: 'recovered',
            data_json: '{"k":"v"}',
            severity: 'medium',
          },
        ])
      );

      const record = await loadLastAlertEventOrThrow({
        queryService,
        spaceId: SPACE_ID,
        groupHash: GROUP_HASH,
        episodeId: 'episode-42',
      });

      expect(record).toEqual({
        '@timestamp': '2025-06-01T12:00:00.000Z',
        group_hash: GROUP_HASH,
        episode_id: 'episode-42',
        episode_status: 'recovering',
        episode_status_count: 2,
        rule_id: 'rule-7',
        rule_version: 3,
        space_id: SPACE_ID,
        status: 'recovered',
        source: 'internal',
        data_json: { k: 'v' },
        severity: 'medium',
      });
    });

    it('issues a single ES|QL query against `.rule-events` filtered by space + group + episode', async () => {
      const { queryService, mockEsClient } = setup();
      mockEsClient.esql.query.mockResolvedValueOnce(
        getAlertEventESQLResponse([{ group_hash: GROUP_HASH, episode_id: 'ep-1' }])
      );

      await loadLastAlertEventOrThrow({
        queryService,
        spaceId: SPACE_ID,
        groupHash: GROUP_HASH,
        episodeId: 'ep-1',
      });

      expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
      const request = mockEsClient.esql.query.mock.calls[0][0];
      expect(request.query).toContain('FROM ".rule-events" METADATA _source');
      expect(request.query).toContain(`space_id == "${SPACE_ID}"`);
      expect(request.query).toContain(`group_hash == "${GROUP_HASH}"`);
      expect(request.query).toContain('episode.id == "ep-1"');
      // Single-event path now delegates to the shared STATS-based loader,
      // so the "latest row" semantics come from `LAST(... @timestamp) BY
      // group_hash, space_id` instead of `SORT @timestamp DESC | LIMIT 1`.
      expect(request.query).toContain('LAST(episode.id, @timestamp)');
      expect(request.query).toContain('BY group_hash, space_id');
      expect(request.query).not.toContain('SORT @timestamp DESC');
      expect(request.query).not.toContain('LIMIT 1');
    });

    it('omits the `episode.id` filter when `episodeId` is not provided', async () => {
      // The route surface lets callers fall back to "latest episode of this
      // group" by omitting `episode_id` — the query must not narrow further
      // in that case.
      const { queryService, mockEsClient } = setup();
      mockEsClient.esql.query.mockResolvedValueOnce(
        getAlertEventESQLResponse([{ group_hash: GROUP_HASH }])
      );

      await loadLastAlertEventOrThrow({
        queryService,
        spaceId: SPACE_ID,
        groupHash: GROUP_HASH,
      });

      const request = mockEsClient.esql.query.mock.calls[0][0];
      expect(request.query).not.toContain('episode.id ==');
      // The omitted-episode branch falls through to a truthy guard so the
      // overall WHERE structure stays well-formed. `esql` normalises the
      // boolean literal to upper-case.
      expect(request.query).toMatch(/AND\s+TRUE/);
    });
  });

  describe('not-found path', () => {
    it('throws `Boom.notFound` with the canonical error code when the response is empty', async () => {
      const { queryService, mockEsClient } = setup();
      mockEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

      const promise = loadLastAlertEventOrThrow({
        queryService,
        spaceId: SPACE_ID,
        groupHash: GROUP_HASH,
        episodeId: 'missing-episode',
      });

      // Single assertion via `rejects.toMatchObject` keeps the runtime
      // contract (status + code + details) co-located with the code under
      // test — route handlers downstream depend on each of these fields.
      await expect(promise).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 404 },
        data: {
          code: ALERTING_V2_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
          details: {
            group_hash: GROUP_HASH,
            episode_id: 'missing-episode',
          },
        },
      });
    });

    it('omits `episode_id` from the error `details` when `episodeId` was not provided', async () => {
      // When the caller doesn't target a specific episode, the error
      // payload shouldn't fabricate one — clients reading the structured
      // `details` need to be able to tell the two cases apart.
      const { queryService, mockEsClient } = setup();
      mockEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

      const promise = loadLastAlertEventOrThrow({
        queryService,
        spaceId: SPACE_ID,
        groupHash: GROUP_HASH,
      });

      let captured: unknown;
      try {
        await promise;
      } catch (err) {
        captured = err;
      }

      expect(Boom.isBoom(captured)).toBe(true);
      const boomErr = captured as Boom.Boom;
      expect(boomErr.data).toEqual({
        code: ALERTING_V2_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
        details: { group_hash: GROUP_HASH },
      });
      expect(boomErr.data.details).not.toHaveProperty('episode_id');
    });
  });
});

describe('loadLatestAlertEvents', () => {
  const SPACE_ID = 'default';

  const setup = () => createQueryService();

  it('short-circuits on an empty `targets` array without issuing any ES|QL query', async () => {
    // Avoids a useless round-trip when the bulk route receives zero
    // items; also guards against an ES|QL parse failure that would
    // otherwise come from the empty `WHERE … (FALSE)` chain.
    const { queryService, mockEsClient } = setup();

    const events = await loadLatestAlertEvents({
      queryService,
      spaceId: SPACE_ID,
      targets: [],
    });

    expect(events).toEqual([]);
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('returns an empty array (instead of throwing) when the response carries no rows', async () => {
    // The throw-on-empty contract belongs to `loadLastAlertEventOrThrow`;
    // the core loader must stay neutral so the bulk route can apply
    // silent-skip semantics per-action.
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

    const events = await loadLatestAlertEvents({
      queryService,
      spaceId: SPACE_ID,
      targets: [{ groupHash: 'g-missing', episodeId: 'ep-missing' }],
    });

    expect(events).toEqual([]);
  });

  it('emits a single ES|QL query whose WHERE chain covers every target', async () => {
    // Each target contributes one `(group_hash == "h" AND …)` disjunct,
    // so a bulk request hits Elasticsearch once regardless of size.
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertEventESQLResponse([
        { group_hash: 'g-1', episode_id: 'ep-1' },
        { group_hash: 'g-2', episode_id: 'ep-2' },
      ])
    );

    await loadLatestAlertEvents({
      queryService,
      spaceId: SPACE_ID,
      targets: [
        { groupHash: 'g-1', episodeId: 'ep-1' },
        { groupHash: 'g-2', episodeId: 'ep-2' },
      ],
    });

    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
    const { query } = mockEsClient.esql.query.mock.calls[0][0];
    expect(query).toContain('group_hash == "g-1"');
    expect(query).toContain('episode.id == "ep-1"');
    expect(query).toContain('group_hash == "g-2"');
    expect(query).toContain('episode.id == "ep-2"');
    // The `esql` engine drops redundant parens around the `AND` disjuncts
    // (since `AND` binds tighter than `OR`), so we only assert the OR
    // separator + the start of the second disjunct.
    expect(query).toMatch(/OR\s+group_hash == "g-2"/);
  });

  it('falls through to `TRUE` on a target with no `episodeId` (no `episode.id ==` narrowing)', async () => {
    // Mirrors how `bulkLoadLatestAlertEvents` maps actions that don't
    // carry `episode_id` (e.g. tag/snooze) — those must reach the
    // "latest event for any episode of this group" lookup.
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertEventESQLResponse([{ group_hash: 'g-no-episode' }])
    );

    await loadLatestAlertEvents({
      queryService,
      spaceId: SPACE_ID,
      targets: [{ groupHash: 'g-no-episode' }],
    });

    const { query } = mockEsClient.esql.query.mock.calls[0][0];
    expect(query).toContain('group_hash == "g-no-episode"');
    expect(query).not.toContain('episode.id ==');
    expect(query).toMatch(/AND\s+TRUE/);
  });

  it('maps every returned row into the canonical `AlertEventRecord` shape', async () => {
    // Locks the projection contract every handler downstream consumes;
    // a column rename in the ES|QL would surface here first.
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertEventESQLResponse([
        {
          '@timestamp': '2025-06-01T12:00:00.000Z',
          group_hash: 'g-1',
          episode_id: 'ep-1',
          episode_status: 'active',
          episode_status_count: 3,
          rule_id: 'rule-1',
          rule_version: 2,
          space_id: SPACE_ID,
          status: 'breached',
          data_json: '{"foo":"bar"}',
          severity: 'high',
        },
      ])
    );

    const [event] = await loadLatestAlertEvents({
      queryService,
      spaceId: SPACE_ID,
      targets: [{ groupHash: 'g-1', episodeId: 'ep-1' }],
    });

    expect(event).toEqual({
      '@timestamp': '2025-06-01T12:00:00.000Z',
      group_hash: 'g-1',
      episode_id: 'ep-1',
      episode_status: 'active',
      episode_status_count: 3,
      rule_id: 'rule-1',
      rule_version: 2,
      space_id: SPACE_ID,
      status: 'breached',
      source: 'internal',
      data_json: { foo: 'bar' },
      severity: 'high',
    });
  });

  it('collapses missing/null/malformed `data_json` rows to `{}` on the way out', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertEventESQLResponse([
        { group_hash: 'g-missing', episode_id: 'ep-missing' },
        { group_hash: 'g-null', episode_id: 'ep-null', data_json: null },
        { group_hash: 'g-malformed', episode_id: 'ep-malformed', data_json: 'not-json' },
      ])
    );

    const events = await loadLatestAlertEvents({
      queryService,
      spaceId: SPACE_ID,
      targets: [
        { groupHash: 'g-missing', episodeId: 'ep-missing' },
        { groupHash: 'g-null', episodeId: 'ep-null' },
        { groupHash: 'g-malformed', episodeId: 'ep-malformed' },
      ],
    });

    expect(events).toHaveLength(3);
    for (const event of events) {
      expect(event.data_json).toEqual({});
    }
  });
});

describe('bulkLoadLatestAlertEvents', () => {
  const SPACE_ID = 'default';

  const setup = () => createQueryService();

  it('forwards `episode_id` for actions that carry one (e.g. `ack`)', async () => {
    // `ack` (and `unack`, `assign`) target a specific episode — the
    // adapter must preserve that narrowing so the loader doesn't return
    // a newer episode's row.
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertEventESQLResponse([{ group_hash: 'g-ack', episode_id: 'ep-ack' }])
    );

    const actions: BulkCreateAlertActionItemBody[] = [
      {
        action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
        group_hash: 'g-ack',
        episode_id: 'ep-ack',
      },
    ];

    await bulkLoadLatestAlertEvents({
      queryService,
      spaceId: SPACE_ID,
      actions,
    });

    const { query } = mockEsClient.esql.query.mock.calls[0][0];
    expect(query).toContain('group_hash == "g-ack"');
    expect(query).toContain('episode.id == "ep-ack"');
  });

  it('omits `episode_id` narrowing for actions without one (e.g. `deactivate`)', async () => {
    // `deactivate` (and `activate`, `tag`, `snooze`, `unsnooze`) target
    // "the current episode of this group" — the adapter must fall
    // through to the truthy guard so the loader picks up the latest row
    // for the group.
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertEventESQLResponse([{ group_hash: 'g-deactivate' }])
    );

    const actions: BulkCreateAlertActionItemBody[] = [
      {
        action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
        group_hash: 'g-deactivate',
        reason: 'manual deactivate',
      },
    ];

    await bulkLoadLatestAlertEvents({
      queryService,
      spaceId: SPACE_ID,
      actions,
    });

    const { query } = mockEsClient.esql.query.mock.calls[0][0];
    expect(query).toContain('group_hash == "g-deactivate"');
    // The disjunct for this target must NOT add an `episode.id` narrowing.
    expect(query).toMatch(/group_hash == "g-deactivate" AND\s+TRUE/);
  });

  it('preserves both narrowing modes side-by-side in a single bulk query', async () => {
    // Mixed bulk requests are the realistic case for `_bulk_action` —
    // the adapter must not collapse the two shapes onto one rule.
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertEventESQLResponse([
        { group_hash: 'g-ack', episode_id: 'ep-ack' },
        { group_hash: 'g-deactivate' },
      ])
    );

    const actions: BulkCreateAlertActionItemBody[] = [
      {
        action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
        group_hash: 'g-ack',
        episode_id: 'ep-ack',
      },
      {
        action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
        group_hash: 'g-deactivate',
        reason: 'manual deactivate',
      },
    ];

    await bulkLoadLatestAlertEvents({
      queryService,
      spaceId: SPACE_ID,
      actions,
    });

    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
    const { query } = mockEsClient.esql.query.mock.calls[0][0];
    expect(query).toMatch(/group_hash == "g-ack" AND\s+episode.id == "ep-ack"/);
    expect(query).toMatch(/group_hash == "g-deactivate" AND\s+TRUE/);
  });

  it('short-circuits to an empty result without issuing an ES|QL query when given no actions', async () => {
    // The bulk route can hand us an empty batch (e.g. after preflight
    // dedupe); the adapter must defer that to the core loader's
    // short-circuit rather than emit a malformed query.
    const { queryService, mockEsClient } = setup();

    const events = await bulkLoadLatestAlertEvents({
      queryService,
      spaceId: SPACE_ID,
      actions: [],
    });

    expect(events).toEqual([]);
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });
});
