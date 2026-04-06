/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDispatchableAlertEventsQuery,
  getAlertEpisodeSuppressionsQuery,
  getLastNotifiedTimestampsQuery,
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

  it('aggregates by rule_id, group_hash, episode_id, episode_status', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('BY rule_id, group_hash, episode_id, episode_status');
  });

  it('keeps the expected output columns', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain(
      'KEEP last_event_timestamp, rule_id, group_hash, episode_id, episode_status'
    );
  });

  it('sorts by timestamp ascending with a limit', () => {
    const req = getDispatchableAlertEventsQuery();

    expect(req.query).toContain('SORT last_event_timestamp ASC');
    expect(req.query).toContain('LIMIT 10000');
  });
});

describe('getAlertEpisodeSuppressionsQuery', () => {
  it('uses CONCAT + IN to filter by (rule_id, group_hash) pairs', () => {
    const episodes = [
      createAlertEpisode({ rule_id: 'rule-1', group_hash: 'hash-1' }),
      createAlertEpisode({ rule_id: 'rule-2', group_hash: 'hash-2' }),
    ];

    const req = getAlertEpisodeSuppressionsQuery(episodes);

    expect(req.query).toContain('CONCAT(rule_id, "::", group_hash)');
    expect(req.query).toContain('rule-1::hash-1');
    expect(req.query).toContain('rule-2::hash-2');
  });

  it('deduplicates episodes with the same rule_id and group_hash', () => {
    const episodes = [
      createAlertEpisode({ rule_id: 'rule-1', group_hash: 'hash-1', episode_id: 'ep-1' }),
      createAlertEpisode({ rule_id: 'rule-1', group_hash: 'hash-1', episode_id: 'ep-2' }),
      createAlertEpisode({ rule_id: 'rule-2', group_hash: 'hash-2', episode_id: 'ep-3' }),
    ];

    const req = getAlertEpisodeSuppressionsQuery(episodes);

    const matches = req.query.match(/rule-1::hash-1/g);
    expect(matches).toHaveLength(1);
    expect(req.query).toContain('rule-2::hash-2');
  });

  it('queries the alert actions data stream', () => {
    const req = getAlertEpisodeSuppressionsQuery([createAlertEpisode()]);

    expect(req.query).toContain('.alert-actions');
  });

  it('filters for suppression action types', () => {
    const req = getAlertEpisodeSuppressionsQuery([createAlertEpisode()]);

    expect(req.query).toContain(
      'action_type IN ("ack", "unack", "deactivate", "activate", "snooze", "unsnooze")'
    );
  });

  it('uses the minimum last_event_timestamp for snooze expiry filtering', () => {
    const episodes = [
      createAlertEpisode({ last_event_timestamp: '2026-01-22T10:00:00.000Z' }),
      createAlertEpisode({ last_event_timestamp: '2026-01-22T08:00:00.000Z' }),
    ];

    const req = getAlertEpisodeSuppressionsQuery(episodes);

    expect(req.query).toContain('expiry > "2026-01-22T08:00:00.000Z"::DATETIME');
  });

  it('falls back to epoch when all timestamps are invalid', () => {
    const episodes = [createAlertEpisode({ last_event_timestamp: 'not-a-date' })];

    const req = getAlertEpisodeSuppressionsQuery(episodes);

    expect(req.query).toContain('expiry > "1970-01-01T00:00:00.000Z"::DATETIME');
  });

  it('skips invalid timestamps when computing minimum', () => {
    const episodes = [
      createAlertEpisode({ last_event_timestamp: 'not-a-date' }),
      createAlertEpisode({ last_event_timestamp: '2026-01-22T09:00:00.000Z' }),
    ];

    const req = getAlertEpisodeSuppressionsQuery(episodes);

    expect(req.query).toContain('expiry > "2026-01-22T09:00:00.000Z"::DATETIME');
  });

  it('computes should_suppress with snooze, ack, and deactivate precedence', () => {
    const req = getAlertEpisodeSuppressionsQuery([createAlertEpisode()]);

    expect(req.query).toContain('EVAL should_suppress = CASE(');
    expect(req.query).toContain('last_snooze_action == "snooze", TRUE');
    expect(req.query).toContain('last_ack_action == "ack", TRUE');
    expect(req.query).toContain('last_deactivate_action == "deactivate", TRUE');
  });

  it('keeps the expected output columns', () => {
    const req = getAlertEpisodeSuppressionsQuery([createAlertEpisode()]);

    expect(req.query).toContain(
      'KEEP rule_id, group_hash, episode_id, should_suppress, last_ack_action, last_deactivate_action, last_snooze_action'
    );
  });

  it('handles a single episode', () => {
    const req = getAlertEpisodeSuppressionsQuery([
      createAlertEpisode({ rule_id: 'only-rule', group_hash: 'only-hash' }),
    ]);

    expect(req.query).toContain('only-rule::only-hash');
  });

  it('builds successfully with a large number of episodes', () => {
    const episodes = Array.from({ length: 500 }, (_, i) =>
      createAlertEpisode({ rule_id: `rule-${i}`, group_hash: `hash-${i}` })
    );

    const req = getAlertEpisodeSuppressionsQuery(episodes);

    expect(req).toHaveProperty('query');
    expect(req.query).toContain('CONCAT(rule_id, "::", group_hash)');
    expect(req.query).toContain('rule-0::hash-0');
    expect(req.query).toContain('rule-499::hash-499');
  });
});

describe('getLastNotifiedTimestampsQuery', () => {
  it('builds a query for a single notification group', () => {
    const req = getLastNotifiedTimestampsQuery(['group-1']);

    expect(req.query).toContain('notification_group_id IN ("group-1")');
    expect(req.query).toContain('.alert-actions');
    expect(req.query).toContain('last_notified = MAX(@timestamp)');
  });

  it('builds a query for multiple notification groups', () => {
    const req = getLastNotifiedTimestampsQuery(['group-1', 'group-2']);

    expect(req.query).toContain('notification_group_id IN ("group-1", "group-2")');
  });

  it('filters for notified action type', () => {
    const req = getLastNotifiedTimestampsQuery(['group-1']);

    expect(req.query).toContain('action_type == "notified"');
  });

  it('keeps the expected output columns', () => {
    const req = getLastNotifiedTimestampsQuery(['group-1']);

    expect(req.query).toContain('KEEP notification_group_id, last_notified');
  });

  it('groups by notification_group_id', () => {
    const req = getLastNotifiedTimestampsQuery(['group-1']);

    expect(req.query).toContain('BY notification_group_id');
  });
});
