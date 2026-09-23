/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTIONS_DATA_STREAM, ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import {
  buildEpisodeActionStateQuery,
  buildEpisodeDetailsQuery,
} from './episodes_page_lookups_query';

const SPACE_ID = 'default';

describe('buildEpisodeActionStateQuery', () => {
  const ids = { episodeIds: ['ep-1', 'ep-2'], groupHashes: ['hash-1', 'hash-2'] };

  it('reads the episode-level and series-level actions of the page in one query', () => {
    const queryString = buildEpisodeActionStateQuery(SPACE_ID, ids).print('basic');

    expect(queryString).toContain(`FROM ${ALERT_ACTIONS_DATA_STREAM}`);
    expect(queryString).toContain(`WHERE space_id == "${SPACE_ID}"`);
    // The composer re-prints the parentheses, AND still binds tighter than OR.
    expect(queryString).toContain(
      'WHERE (episode_id IN ("ep-1", "ep-2")) AND (action_type IN ("ack", "unack", "assign", "tag")) OR (group_hash IN ("hash-1", "hash-2")) AND (action_type IN ("snooze", "unsnooze"))'
    );
  });

  it('keys snooze rows by group hash and the other actions by episode id', () => {
    const queryString = buildEpisodeActionStateQuery(SPACE_ID, ids).print('basic');

    expect(queryString).toContain(
      'EVAL action_key = CASE(action_type IN ("snooze", "unsnooze"), group_hash, episode_id)'
    );
    expect(queryString).toContain('STATS last_snooze_action = LAST(action_type, @timestamp)');
    expect(queryString).toContain(
      'snooze_expiry = LAST(expiry, @timestamp) WHERE action_type == "snooze"'
    );
    expect(queryString).toContain('last_ack_action = LAST(action_type, @timestamp)');
    expect(queryString).toContain(
      'last_assignee_uid = LAST(assignee_uid, @timestamp) WHERE action_type == "assign"'
    );
    expect(queryString).toContain('last_tags = LAST(tags, @timestamp) WHERE action_type == "tag"');
    expect(queryString).toContain('BY action_key');
  });

  it('escapes the ids', () => {
    const queryString = buildEpisodeActionStateQuery(SPACE_ID, {
      episodeIds: ['a"b'],
      groupHashes: ['c"d'],
    }).print('basic');

    expect(queryString).toContain(String.raw`a\"b`);
    expect(queryString).toContain(String.raw`c\"d`);
  });
});

describe('buildEpisodeDetailsQuery', () => {
  it('returns the exact boundaries, trigger time, severity and data of the given episodes', () => {
    const queryString = buildEpisodeDetailsQuery(SPACE_ID, ['ep-1', 'ep-2']).print('basic');

    expect(queryString).toContain(`FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source`);
    expect(queryString).toContain(`WHERE space_id == "${SPACE_ID}"`);
    expect(queryString).toContain('WHERE type == "alert"');
    expect(queryString).toContain('WHERE `episode.id` IN ("ep-1", "ep-2")');
    expect(queryString).toContain(
      'INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp), data_timestamp = MAX(@timestamp) WHERE status == "breached"'
    );
    expect(queryString).toContain(
      'triggered_at = MIN(@timestamp) WHERE `episode.status` == "active"'
    );
    expect(queryString).toContain('WHERE @timestamp == COALESCE(data_timestamp, last_timestamp)');
    expect(queryString).toContain('EVAL episode_data = JSON_EXTRACT(_source, "data")');
    expect(queryString).toContain(
      'KEEP `episode.id`, first_timestamp, last_timestamp, triggered_at, severity, episode_data'
    );
  });
});
