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
  getEpisodeDataQueries,
} from './queries';
import { createAlertEpisode } from './fixtures/test_utils';

describe('getDispatchableAlertEventsQuery', () => {
  const SCAN_WINDOW = {
    gte: '2026-01-22T07:20:00.000Z',
    lte: '2026-01-22T07:35:00.000Z',
  } as const;

  const queryOf = () => getDispatchableAlertEventsQuery(SCAN_WINDOW).query;

  it('returns a valid ES|QL request', () => {
    const req = getDispatchableAlertEventsQuery(SCAN_WINDOW);

    expect(req).toHaveProperty('query');
    expect(typeof req.query).toBe('string');
  });

  it('queries both alert events and alert actions data streams', () => {
    const query = queryOf();

    expect(query).toContain('.rule-events');
    expect(query).toContain('.alert-actions');
  });

  it('filters for alert event type', () => {
    expect(queryOf()).toContain('type == "alert"');
  });

  it('caps the scan window on event rows only so action rows after lte still feed last_fired', () => {
    const query = queryOf();

    // Action rows (`type IS NULL`) bypass the timestamp predicate. Event rows
    // are capped at [gte, lte]. Two WHERE clauses keep that contract readable
    // after the builder strips grouping parentheses.
    expect(query).toContain('type IS NULL OR type == "alert"');
    expect(query).toContain(
      `type IS NULL OR @timestamp >= "${SCAN_WINDOW.gte}"::DATETIME AND @timestamp <= "${SCAN_WINDOW.lte}"::DATETIME`
    );
    expect(query.indexOf('type IS NULL OR @timestamp >=')).toBeLessThan(
      query.indexOf('INLINE STATS')
    );
  });

  it('coalesces rule_id and episode_id from both schemas', () => {
    const query = queryOf();

    expect(query).toContain('COALESCE(rule.id, rule_id)');
    expect(query).toContain('COALESCE(episode.id, episode_id)');
  });

  it('computes last_fired via INLINE STATS for fire/suppress/unmatched actions', () => {
    const query = queryOf();

    expect(query).toContain('last_fired = MAX(last_series_event_timestamp)');
    expect(query).toContain(
      'action_type == "fire" OR action_type == "suppress" OR action_type == "unmatched"'
    );
  });

  it('aggregates by subject, group_hash, episode_id with episode_status as LAST aggregation', () => {
    const query = queryOf();

    expect(query).toContain('BY subject, group_hash, episode_id');
    expect(query).not.toContain('BY subject, group_hash, episode_id, episode_status');
    expect(query).toContain('last_episode_status = LAST(episode_status, @timestamp)');
  });

  it('does not request _source metadata (keys-only scan)', () => {
    const query = queryOf();

    expect(query).not.toContain('METADATA _source');
    expect(query).not.toContain('_index');
  });

  it('does not contain JSON_EXTRACT or data_json (data hydrated separately)', () => {
    const query = queryOf();

    expect(query).not.toContain('JSON_EXTRACT');
    expect(query).not.toContain('data_json');
  });

  it('aggregates severity using LAST by timestamp scoped to rule-event rows', () => {
    expect(queryOf()).toContain('severity = LAST(severity, @timestamp) WHERE type IS NOT NULL');
  });

  it('keeps the expected output columns without data_json and renames episode_status', () => {
    const query = queryOf();

    expect(query).toContain(
      'KEEP last_event_timestamp, rule_id, source, space_id, group_hash, episode_id, last_episode_status, severity'
    );
    expect(query).not.toContain('data_json');
    expect(query).toContain('RENAME last_episode_status AS episode_status');
  });

  it('computes subject via CASE to group internal and external episodes separately', () => {
    expect(queryOf()).toContain('subject = CASE(');
  });

  it('drops rows whose subject could not be resolved, before any aggregation', () => {
    const query = queryOf();

    expect(query).toContain('WHERE subject IS NOT NULL');
    expect(query.indexOf('WHERE subject IS NOT NULL')).toBeLessThan(query.indexOf('INLINE STATS'));
  });

  it('groups INLINE STATS BY subject, group_hash (not rule_id, group_hash)', () => {
    const query = queryOf();

    expect(query).toContain('BY subject, group_hash');
    expect(query).not.toContain('BY rule_id, group_hash');
  });

  it('groups STATS BY subject, group_hash, episode_id', () => {
    expect(queryOf()).toContain('BY subject, group_hash, episode_id');
  });

  it('projects source and space_id via LAST aggregation', () => {
    const query = queryOf();

    expect(query).toContain('source = LAST(source, @timestamp) WHERE type IS NOT NULL');
    expect(query).toContain('space_id = LAST(space_id, @timestamp) WHERE type IS NOT NULL');
    expect(query).toContain('KEEP last_event_timestamp, rule_id, source, space_id,');
  });

  it('sorts by timestamp ascending with a limit', () => {
    const query = queryOf();

    expect(query).toContain('SORT last_event_timestamp ASC');
    expect(query).toContain('LIMIT 10000');
  });
});

describe('getEpisodeDataQueries', () => {
  const GTE = '2026-01-22T07:00:00.000Z';
  const LTE = '2026-01-22T07:10:00.000Z';

  it('returns an empty array for empty input', () => {
    expect(getEpisodeDataQueries([], { gte: GTE, lte: LTE })).toEqual([]);
  });

  it('returns a valid ES|QL request for a single episode id', () => {
    const requests = getEpisodeDataQueries(['ep-1'], { gte: GTE, lte: LTE });

    expect(requests).toHaveLength(1);
    expect(typeof requests[0].query).toBe('string');
  });

  it('queries only the alert events data stream', () => {
    const requests = getEpisodeDataQueries(['ep-1'], { gte: GTE, lte: LTE });

    expect(requests[0].query).toContain('.rule-events');
    expect(requests[0].query).not.toContain('.alert-actions');
  });

  it('requests _source metadata for JSON_EXTRACT', () => {
    const requests = getEpisodeDataQueries(['ep-1'], { gte: GTE, lte: LTE });

    expect(requests[0].query).toContain('METADATA _source');
  });

  it('places WHERE before JSON_EXTRACT so _source is fetched only for matching rows', () => {
    const requests = getEpisodeDataQueries(['ep-1'], { gte: GTE, lte: LTE });
    const query = requests[0].query;

    const whereIdx = query.indexOf('WHERE type ==');
    const extractIdx = query.indexOf('JSON_EXTRACT(_source');

    expect(whereIdx).toBeGreaterThan(-1);
    expect(extractIdx).toBeGreaterThan(-1);
    expect(whereIdx).toBeLessThan(extractIdx);
  });

  it('filters by type == "alert", episode.id IN (...), and timestamp range', () => {
    const requests = getEpisodeDataQueries(['ep-1', 'ep-2'], { gte: GTE, lte: LTE });
    const query = requests[0].query;

    expect(query).toContain('type == "alert"');
    expect(query).toContain('episode.id IN');
    expect(query).toContain('"ep-1"');
    expect(query).toContain('"ep-2"');
    expect(query).toContain(`"${GTE}"`);
    expect(query).toContain(`"${LTE}"`);
  });

  it('inlines range bounds as ::datetime literals', () => {
    const requests = getEpisodeDataQueries(['ep-1'], { gte: GTE, lte: LTE });
    const query = requests[0].query;

    expect(query).toContain(`"${GTE}"::DATETIME`);
    expect(query).toContain(`"${LTE}"::DATETIME`);
  });

  it('extracts data_json via JSON_EXTRACT(_source, "$.data")', () => {
    const requests = getEpisodeDataQueries(['ep-1'], { gte: GTE, lte: LTE });

    expect(requests[0].query).toContain('JSON_EXTRACT(_source, "$.data")');
  });

  it('drops _source before the STATS buffer', () => {
    const requests = getEpisodeDataQueries(['ep-1'], { gte: GTE, lte: LTE });
    const query = requests[0].query;

    const dropIdx = query.indexOf('DROP _source');
    const statsIdx = query.indexOf('STATS data_json');

    expect(dropIdx).toBeGreaterThan(-1);
    expect(statsIdx).toBeGreaterThan(-1);
    expect(dropIdx).toBeLessThan(statsIdx);
  });

  it('aggregates data_json using LAST by timestamp grouped by episode_id', () => {
    const requests = getEpisodeDataQueries(['ep-1'], { gte: GTE, lte: LTE });

    expect(requests[0].query).toContain('LAST(data_json, @timestamp) BY episode_id');
  });

  it('keeps only episode_id and data_json', () => {
    const requests = getEpisodeDataQueries(['ep-1'], { gte: GTE, lte: LTE });

    expect(requests[0].query).toContain('KEEP episode_id, data_json');
  });

  it('splits into multiple requests when episode ids exceed the size budget', () => {
    // 36-byte UUIDs + 6 bytes overhead = 42 bytes each; ~14_285 per 600 KB chunk.
    const longIds = Array.from({ length: 200 }, (_, i) => 'x'.repeat(4_000) + `-${i}`);

    const requests = getEpisodeDataQueries(longIds, { gte: GTE, lte: LTE });

    expect(requests.length).toBeGreaterThanOrEqual(2);
    for (const request of requests) {
      expect(request.query.length).toBeLessThan(1_000_000);
    }
    const concatenated = requests.map((r) => r.query).join('\n');
    expect(concatenated).toContain(longIds[0]);
    expect(concatenated).toContain(longIds[longIds.length - 1]);
  });

  it('applies the same gte/lte bounds on every chunk', () => {
    const longIds = Array.from({ length: 200 }, (_, i) => 'x'.repeat(4_000) + `-${i}`);
    const requests = getEpisodeDataQueries(longIds, { gte: GTE, lte: LTE });

    expect(requests.length).toBeGreaterThanOrEqual(2);
    for (const request of requests) {
      expect(request.query).toContain(`"${GTE}"`);
      expect(request.query).toContain(`"${LTE}"`);
    }
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

  it('honors a custom budget smaller than the default', () => {
    const literalSize = 100;
    const literals = Array.from({ length: 100 }, (_, i) => `${i}`.padStart(literalSize, '0'));
    const budget = 1_000;

    const chunks = chunkInClauseLiterals(literals, budget);

    expect(chunks.length).toBeGreaterThan(chunkInClauseLiterals(literals).length);
    for (const chunk of chunks) {
      const chunkBytes = chunk.reduce((sum, lit) => sum + lit.length + PER_LITERAL_OVERHEAD, 0);
      // A single literal may exceed the budget (own chunk); multi-literal chunks must stay within.
      if (chunk.length > 1) {
        expect(chunkBytes).toBeLessThanOrEqual(budget);
      }
    }
  });
});

describe('getAlertEpisodeSuppressionsQueries', () => {
  it('returns an empty array for empty input', () => {
    expect(getAlertEpisodeSuppressionsQueries([])).toEqual([]);
  });

  it('uses CONCAT + IN to filter by (subject, group_hash) pairs', () => {
    const episodes = [
      createAlertEpisode({ rule_id: 'rule-1', group_hash: 'hash-1' }),
      createAlertEpisode({ rule_id: 'rule-2', group_hash: 'hash-2' }),
    ];

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    expect(requests).toHaveLength(1);
    expect(requests[0].query).toContain('CONCAT(subject, "::", group_hash)');
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

  it('classifies snooze rows by expiry instead of pre-filtering expired ones', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    // Expired snoozes must stay in the row set so LAST() still sees them: dropping them before
    // LAST() would resurrect an older snooze (e.g. an indefinite one) as the latest snooze action.
    expect(requests[0].query).not.toContain('action_type != "snooze"');
    expect(requests[0].query).toContain('action_type == "snooze", "snooze_expired"');
    expect(requests[0].query).toContain('LAST(_snooze_action, @timestamp)');
  });

  it('retains indefinite snoozes (no expiry) as active snoozes', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    // `expiry > <ts>` alone evaluates to NULL when expiry is NULL (ES|QL null comparison), which
    // would misclassify indefinite snoozes as expired. `expiry IS NULL` marks them active.
    expect(requests[0].query).toContain('expiry IS NULL OR expiry > ');
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

  it('keeps the expected output columns including source and rule_id', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain('rule_id = LAST(rule_id, @timestamp)');
    expect(requests[0].query).toContain(
      'KEEP rule_id, group_hash, episode_id, should_suppress, last_ack_action, last_deactivate_action, last_snooze_action, source'
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
    expect(requests[0].query).toContain('CONCAT(subject, "::", group_hash)');
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

  it('computes subject via CASE to distinguish internal from external episodes', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain(
      'subject = CASE(source IS NULL OR source == "internal", rule_id, CONCAT(space_id, "::", source))'
    );
  });

  it('builds _pair_key from subject (not rule_id directly)', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain('CONCAT(subject, "::", group_hash)');
    expect(requests[0].query).not.toContain('CONCAT(rule_id, "::", group_hash)');
  });

  it('groups INLINE STATS BY subject, group_hash', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain('BY subject, group_hash');
  });

  it('groups STATS BY subject, group_hash, episode_id', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain('BY subject, group_hash, episode_id');
  });

  it('projects source and space_id via LAST aggregation in STATS', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain('source = LAST(source, @timestamp)');
    expect(requests[0].query).toContain('space_id = LAST(space_id, @timestamp)');
  });

  it('keeps the expected output columns', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain(
      'KEEP rule_id, group_hash, episode_id, should_suppress, last_ack_action, last_deactivate_action, last_snooze_action, source, space_id'
    );
  });

  it('drops rows whose subject could not be resolved', () => {
    const requests = getAlertEpisodeSuppressionsQueries([createAlertEpisode()]);

    expect(requests[0].query).toContain('WHERE subject IS NOT NULL');
  });

  it('uses episodeSubject for pair key construction (internal episode uses rule_id)', () => {
    const episodes = [
      createAlertEpisode({ source: 'internal', rule_id: 'rule-abc', group_hash: 'hash-abc' }),
    ];

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    // For internal episodes, episodeSubject returns rule_id
    expect(requests[0].query).toContain('rule-abc::hash-abc');
  });

  it('uses episodeSubject for pair key construction (external episode uses space-scoped source)', () => {
    const episodes = [
      createAlertEpisode({ source: 'pagerduty', rule_id: null, group_hash: 'hash-pd' }),
    ];

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    // For external episodes, episodeSubject returns `${space_id}::${source}`
    expect(requests[0].query).toContain('default::pagerduty::hash-pd');
  });

  it('builds distinct pair keys for the same vendor and group_hash in different spaces', () => {
    const episodes = [
      createAlertEpisode({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'space-a',
        group_hash: 'hash-pd',
      }),
      createAlertEpisode({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'space-b',
        group_hash: 'hash-pd',
      }),
    ];

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    expect(requests[0].query).toContain('space-a::pagerduty::hash-pd');
    expect(requests[0].query).toContain('space-b::pagerduty::hash-pd');
  });

  it('pushes a group_hash + rule_id pre-filter before the CONCAT for internal episodes', () => {
    const episodes = [
      createAlertEpisode({ rule_id: 'rule-1', group_hash: 'hash-1', episode_id: 'ep-1' }),
      createAlertEpisode({ rule_id: 'rule-2', group_hash: 'hash-2', episode_id: 'ep-2' }),
    ];

    const { query } = getAlertEpisodeSuppressionsQueries(episodes)[0];

    expect(query).toContain('group_hash IN ("hash-1", "hash-2")');
    expect(query).toContain('rule_id IN ("rule-1", "rule-2")');
    // Internal-only episodes need no external branch.
    expect(query).not.toContain('space_id IN (');
    expect(query).not.toContain('source IN (');
  });

  it('places the raw-field pre-filter before the subject EVAL so it can push down', () => {
    const { query } = getAlertEpisodeSuppressionsQueries([createAlertEpisode()])[0];

    expect(query.indexOf('group_hash IN (')).toBeLessThan(query.indexOf('subject = CASE('));
  });

  it('uses a space_id + source pre-filter branch for external episodes (never filters on a null rule_id)', () => {
    const episodes = [
      createAlertEpisode({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'space-a',
        group_hash: 'hash-pd',
      }),
    ];

    const { query } = getAlertEpisodeSuppressionsQueries(episodes)[0];

    expect(query).toContain('group_hash IN ("hash-pd")');
    expect(query).toContain('space_id IN ("space-a")');
    expect(query).toContain('source IN ("pagerduty")');
    // External episodes have a null rule_id, so a rule_id filter would drop them entirely.
    expect(query).not.toContain('rule_id IN (');
  });

  it('combines internal and external branches with OR, distributing group_hash into each', () => {
    const episodes = [
      createAlertEpisode({ source: 'internal', rule_id: 'rule-1', group_hash: 'hash-1' }),
      createAlertEpisode({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'space-a',
        group_hash: 'hash-pd',
        episode_id: 'ep-2',
      }),
    ];

    const { query } = getAlertEpisodeSuppressionsQueries(episodes)[0];

    expect(query).toContain('rule_id IN ("rule-1")');
    expect(query).toContain('space_id IN ("space-a")');
    expect(query).toContain('source IN ("pagerduty")');
    // group_hash is repeated in the external branch (after OR) so precedence keeps it applied to
    // external docs even though the builder strips grouping parentheses.
    expect(query).toContain('OR (group_hash IN ("hash-1", "hash-pd"))');
    // Two group_hash IN clauses: one per branch.
    expect(query.match(/group_hash IN \(/g)).toHaveLength(2);
  });

  it('derives each chunk pre-filter from only that chunk pair keys and stays under the ES|QL limit', () => {
    // pair key length = 2 * 5_000 + 2 ('::') per literal; with the 300 KB suppressions budget and
    // the added pre-filter this spans multiple chunks.
    const longSegment = 'p'.repeat(5_000);
    const episodes = Array.from({ length: 200 }, (_, i) =>
      createAlertEpisode({
        rule_id: `${longSegment}-r${i}`,
        group_hash: `${longSegment}-g${i}`,
        episode_id: `ep-${i}`,
      })
    );

    const requests = getAlertEpisodeSuppressionsQueries(episodes);

    expect(requests.length).toBeGreaterThanOrEqual(2);
    for (const request of requests) {
      expect(request.query).toContain('WHERE ');
      expect(request.query).toContain('group_hash IN (');
      expect(request.query.length).toBeLessThan(1_000_000);
    }
    // The first chunk must not carry the last episode's rule_id (per-chunk scoping).
    expect(requests[0].query).not.toContain(`${longSegment}-r199`);
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
