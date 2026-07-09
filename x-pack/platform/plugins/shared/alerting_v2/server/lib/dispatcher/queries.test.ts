/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ESQL_IN_CLAUSE_LITERAL_BUDGET_BYTES,
  chunkInClauseLiterals,
  getDispatchableAlertEventsQuery,
  getAlertEpisodeSuppressionsQueries,
  getLastNotifiedTimestampsQueries,
} from './queries';
import { createAlertEpisode } from './fixtures/test_utils';

describe('getDispatchableAlertEventsQuery', () => {
  it('returns a valid ES|QL request', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req).toHaveProperty('query');
    expect(typeof req.query).toBe('string');
  });

  it('queries both alert events and alert actions data streams', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('.rule-events');
    expect(req.query).toContain('.alert-actions');
  });

  it('filters for alert event type', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('type == "alert"');
  });

  it('coalesces rule_id and episode_id from both schemas', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('COALESCE(rule.id, rule_id)');
    expect(req.query).toContain('COALESCE(episode.id, episode_id)');
  });

  it('computes last_fired via INLINE STATS for fire/suppress/unmatched actions', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('last_fired = MAX(last_series_event_timestamp)');
    expect(req.query).toContain(
      'action_type == "fire" OR action_type == "suppress" OR action_type == "unmatched"'
    );
  });

  it('aggregates by rule_id, group_hash, episode_id with episode_status as LAST aggregation', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('BY rule_id, group_hash, episode_id');
    expect(req.query).not.toContain('BY rule_id, group_hash, episode_id, episode_status');
    expect(req.query).toContain('last_episode_status = LAST(episode_status, @timestamp)');
  });

  it('fetches _source metadata', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('METADATA _source');
    expect(req.query).not.toContain('_index');
  });

  it('extracts data_json from _source using JSON_EXTRACT for rule-events rows', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('JSON_EXTRACT(_source, "$.data")');
  });

  it('drops _source after JSON_EXTRACT and before INLINE STATS to keep sub-plan buffers small', () => {
    const req = getDispatchableAlertEventsQuery();

    const extractIdx = req.query.indexOf('JSON_EXTRACT(_source');
    const dropIdx = req.query.indexOf('DROP episode.id, rule.id, episode.status, _source');
    const inlineStatsIdx = req.query.indexOf('INLINE STATS');

    expect(extractIdx).toBeGreaterThan(-1);
    expect(dropIdx).toBeGreaterThan(extractIdx);
    expect(inlineStatsIdx).toBeGreaterThan(dropIdx);
  });

  it('aggregates data_json using LAST by timestamp', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('data_json = LAST(data_json, @timestamp)');
  });

  it('aggregates severity using LAST by timestamp scoped to rule-event rows', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('severity = LAST(severity, @timestamp) WHERE type IS NOT NULL');
  });

  it('keeps the expected output columns and renames episode_status', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain(
      'KEEP last_event_timestamp, rule_id, group_hash, episode_id, last_episode_status, data_json, severity'
    );
    expect(req.query).toContain('RENAME last_episode_status AS episode_status');
  });

  it('sorts by timestamp ascending with a limit', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('SORT last_event_timestamp ASC');
    expect(req.query).toContain('LIMIT 10000');
  });
});

describe('chunkInClauseLiterals', () => {
  const PER_LITERAL_OVERHEAD = 6;

  it('returns an empty array for empty input', () => {
    expect(chunkInClauseLiterals([])).toEqual([]);
  });

  it('returns a single chunk when one literal fits the budget', () => {
    expect(chunkInClauseLiterals(['only'])).toEqual([['only']]);
  });

  it('returns a single chunk when many small literals fit the budget', () => {
    const literals = ['a', 'b', 'c', 'd'];
    expect(chunkInClauseLiterals(literals)).toEqual([literals]);
  });

  it('preserves input order across chunks', () => {
    const literalSize = 1_000;
    const literalsPerChunk = Math.floor(
      ESQL_IN_CLAUSE_LITERAL_BUDGET_BYTES / (literalSize + PER_LITERAL_OVERHEAD)
    );
    const literals = Array.from({ length: literalsPerChunk * 2 + 5 }, (_, i) =>
      `${i}`.padStart(literalSize, '0')
    );

    const chunks = chunkInClauseLiterals(literals);

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.flat()).toEqual(literals);
  });

  it('keeps each chunk under the byte budget', () => {
    const literalSize = 100;
    const literals = Array.from({ length: 20_000 }, (_, i) => `${i}`.padStart(literalSize, '0'));

    const chunks = chunkInClauseLiterals(literals);

    for (const chunk of chunks) {
      const chunkBytes = chunk.reduce((sum, lit) => sum + lit.length + PER_LITERAL_OVERHEAD, 0);
      expect(chunkBytes).toBeLessThanOrEqual(ESQL_IN_CLAUSE_LITERAL_BUDGET_BYTES);
    }
  });

  it('places a single oversized literal alone in its own chunk', () => {
    const oversized = 'x'.repeat(ESQL_IN_CLAUSE_LITERAL_BUDGET_BYTES + 1);
    const small = 'tiny';

    const chunks = chunkInClauseLiterals([small, oversized, small]);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual([small]);
    expect(chunks[1]).toEqual([oversized]);
    expect(chunks[2]).toEqual([small]);
  });

  it('produces no overlap between chunks', () => {
    const literalSize = 500;
    const literals = Array.from({ length: 5_000 }, (_, i) => `id-${i}`.padEnd(literalSize, '_'));

    const chunks = chunkInClauseLiterals(literals);
    const seen = new Set<string>();
    for (const chunk of chunks) {
      for (const lit of chunk) {
        expect(seen.has(lit)).toBe(false);
        seen.add(lit);
      }
    }

    expect(seen.size).toBe(literals.length);
  });
});

describe('getAlertEpisodeSuppressionsQueries', () => {
  it('returns an empty array for empty input', () => {
    expect(getAlertEpisodeSuppressionsQueries([])).toEqual([]);
  });

  it('uses CONCAT + IN to filter by (rule_id, group_hash) pairs', () => {
    const episodes = [
      createAlertEpisode({ rule_id: 'rule-1', group_hash: 'hash-1' }),
      createAlertEpisode({ rule_id: 'rule-2', group_hash: 'hash-2' }),
    ];

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    expect(requests).toHaveLength(1);
    expect(requests[0].query).toContain('CONCAT(rule_id, "::", group_hash)');
    expect(requests[0].query).toContain('rule-1::hash-1');
    expect(requests[0].query).toContain('rule-2::hash-2');
  });

  it('deduplicates episodes with the same rule_id and group_hash', () => {
    const episodes = [
      createAlertEpisode({ rule_id: 'rule-1', group_hash: 'hash-1', episode_id: 'ep-1' }),
      createAlertEpisode({ rule_id: 'rule-1', group_hash: 'hash-1', episode_id: 'ep-2' }),
      createAlertEpisode({ rule_id: 'rule-2', group_hash: 'hash-2', episode_id: 'ep-3' }),
    ];

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    const matches = requests[0].query.match(/rule-1::hash-1/g);
    expect(matches).toHaveLength(1);
    expect(requests[0].query).toContain('rule-2::hash-2');
  });

  it('queries the alert actions data stream', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain('.alert-actions');
  });

  it('filters for suppression action types', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain(
      'action_type IN ("ack", "unack", "deactivate", "activate", "snooze", "unsnooze")'
    );
  });

  it('uses the minimum last_event_timestamp for snooze expiry filtering', () => {
    const episodes = [
      createAlertEpisode({ last_event_timestamp: '2026-01-22T10:00:00.000Z' }),
      createAlertEpisode({ last_event_timestamp: '2026-01-22T08:00:00.000Z' }),
    ];

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    expect(requests[0].query).toContain('expiry > "2026-01-22T08:00:00.000Z"::DATETIME');
  });

  it('falls back to epoch when all timestamps are invalid', () => {
    const episodes = [createAlertEpisode({ last_event_timestamp: 'not-a-date' })];

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    expect(requests[0].query).toContain('expiry > "1970-01-01T00:00:00.000Z"::DATETIME');
  });

  it('skips invalid timestamps when computing minimum', () => {
    const episodes = [
      createAlertEpisode({ last_event_timestamp: 'not-a-date' }),
      createAlertEpisode({ last_event_timestamp: '2026-01-22T09:00:00.000Z' }),
    ];

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    expect(requests[0].query).toContain('expiry > "2026-01-22T09:00:00.000Z"::DATETIME');
  });

  it('computes should_suppress with snooze, ack, and deactivate precedence', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain('EVAL should_suppress = CASE(');
    expect(requests[0].query).toContain('last_snooze_action == "snooze", TRUE');
    expect(requests[0].query).toContain('last_ack_action == "ack", TRUE');
    expect(requests[0].query).toContain('last_deactivate_action == "deactivate", TRUE');
  });

  it('keeps the expected output columns', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain(
      'KEEP rule_id, group_hash, episode_id, should_suppress, last_ack_action, last_deactivate_action, last_snooze_action'
    );
  });

  it('handles a single episode', () => {
    const requests = getAlertEpisodeSuppressionsQueries([
      createAlertEpisode({ rule_id: 'only-rule', group_hash: 'only-hash' }),
    ]);

    expect(requests).toHaveLength(1);
    expect(requests[0].query).toContain('only-rule::only-hash');
  });

  it('builds successfully with a large number of episodes', () => {
    const episodes = Array.from({ length: 500 }, (_, i) =>
      createAlertEpisode({ rule_id: `rule-${i}`, group_hash: `hash-${i}` })
    );

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    expect(requests).toHaveLength(1);
    expect(requests[0].query).toContain('CONCAT(rule_id, "::", group_hash)');
    expect(requests[0].query).toContain('rule-0::hash-0');
    expect(requests[0].query).toContain('rule-499::hash-499');
  });

  it('splits into multiple requests when pair keys exceed the size budget', () => {
    // pair key length = 2 * 5_000 + 2 ('::') = 10_002 bytes per literal.
    // ~60 literals per chunk → 200 literals span at least 3 chunks.
    const longSegment = 'x'.repeat(5_000);
    const episodes = Array.from({ length: 200 }, (_, i) =>
      createAlertEpisode({ rule_id: `${longSegment}-r${i}`, group_hash: `${longSegment}-g${i}` })
    );

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    expect(requests.length).toBeGreaterThanOrEqual(2);
    for (const request of requests) {
      expect(request.query.length).toBeLessThan(1_000_000);
    }
    const concatenated = requests.map((r) => r.query).join('\n');
    expect(concatenated).toContain(`${longSegment}-r0::${longSegment}-g0`);
    expect(concatenated).toContain(`${longSegment}-r199::${longSegment}-g199`);
  });

  it('uses the same minLastEventTimestamp on every chunk', () => {
    const longSegment = 'y'.repeat(5_000);
    const episodes = Array.from({ length: 200 }, (_, i) =>
      createAlertEpisode({
        rule_id: `${longSegment}-r${i}`,
        group_hash: `${longSegment}-g${i}`,
        last_event_timestamp: i === 0 ? '2026-03-01T00:00:00.000Z' : '2026-03-15T00:00:00.000Z',
      })
    );

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    expect(requests.length).toBeGreaterThanOrEqual(2);
    for (const request of requests) {
      expect(request.query).toContain('expiry > "2026-03-01T00:00:00.000Z"::DATETIME');
    }
  });
});

describe('getLastNotifiedTimestampsQueries', () => {
  it('returns an empty array for empty input', () => {
    expect(getLastNotifiedTimestampsQueries([])).toEqual([]);
  });

  it('builds a query for a single action group', () => {
    const requests = getLastNotifiedTimestampsQueries(['group-1']);

    expect(requests).toHaveLength(1);
    expect(requests[0].query).toContain('action_group_id IN ("group-1")');
    expect(requests[0].query).toContain('.alert-actions');
    expect(requests[0].query).toContain('last_notified = MAX(@timestamp)');
  });

  it('builds a query for multiple action groups', () => {
    const requests = getLastNotifiedTimestampsQueries(['group-1', 'group-2']);

    expect(requests).toHaveLength(1);
    expect(requests[0].query).toContain('action_group_id IN ("group-1", "group-2")');
  });

  it('filters for notified action type', () => {
    const requests = getLastNotifiedTimestampsQueries(['group-1']);

    expect(requests[0].query).toContain('action_type == "notified"');
  });

  it('keeps the expected output columns', () => {
    const requests = getLastNotifiedTimestampsQueries(['group-1']);

    expect(requests[0].query).toContain('KEEP action_group_id, last_notified, episode_status');
  });

  it('aggregates episode_status using LAST by timestamp', () => {
    const requests = getLastNotifiedTimestampsQueries(['group-1']);

    expect(requests[0].query).toContain('episode_status = LAST(episode_status, @timestamp)');
  });

  it('groups by action_group_id', () => {
    const requests = getLastNotifiedTimestampsQueries(['group-1']);

    expect(requests[0].query).toContain('BY action_group_id');
  });

  it('splits into multiple requests when ids exceed the size budget', () => {
    const longSegment = 'z'.repeat(10_000);
    const ids = Array.from({ length: 200 }, (_, i) => `${longSegment}-${i}`);

    const requests = getLastNotifiedTimestampsQueries(ids);

    expect(requests.length).toBeGreaterThanOrEqual(2);
    for (const request of requests) {
      expect(request.query.length).toBeLessThan(1_000_000);
    }
    const concatenated = requests.map((r) => r.query).join('\n');
    for (const id of [ids[0], ids[ids.length - 1]]) {
      expect(concatenated).toContain(id);
    }
  });
});
