/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTIONS_DATA_STREAM, ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import {
  buildEpisodeDataRequest,
  buildEpisodesDataRequest,
  buildEpisodeQuery,
  buildSeriesSnoozeQuery,
  EPISODE_DATA_FILTER,
  EPISODE_EVENTS_FIELDS,
} from './episode_query';

const SPACE_ID = 'default';
const GROUP_HASH = 'group-hash-1';
const SERIES_ID = 'series-1';

describe('buildEpisodeQuery', () => {
  it('only reads indexed rule event fields', () => {
    const queryString = buildEpisodeQuery(SPACE_ID, 'ep-1').print('basic');
    expect(queryString).toMatch(new RegExp(`^FROM ${ALERT_EVENTS_DATA_STREAM} \\|`));
    expect(queryString).not.toContain('_source');
    expect(queryString).not.toContain(ALERT_ACTIONS_DATA_STREAM);
  });

  it('filters by space and episode id before the aggregation', () => {
    const queryString = buildEpisodeQuery(SPACE_ID, 'ep-1').print('basic');
    const spaceFilterIndex = queryString.indexOf(`space_id == "${SPACE_ID}"`);
    const episodeFilterIndex = queryString.indexOf('episode.id == "ep-1"');
    const statsIndex = queryString.indexOf('STATS');

    expect(spaceFilterIndex).toBeGreaterThan(-1);
    expect(episodeFilterIndex).toBeGreaterThan(-1);
    expect(episodeFilterIndex).toBeLessThan(statsIndex);
  });

  it('aggregates the episode in a single STATS', () => {
    const queryString = buildEpisodeQuery(SPACE_ID, 'ep-1').print('basic');
    expect(queryString).not.toContain('INLINE STATS');
    expect(queryString).toContain('last_timestamp = MAX(@timestamp)');
    expect(queryString).toContain('first_timestamp = MIN(@timestamp)');
    expect(queryString).toContain(
      'triggered_at = MIN(@timestamp) WHERE `episode.status` == "active"'
    );
    expect(queryString).toContain('`episode.status` = LAST(`episode.status`, @timestamp)');
    expect(queryString).toContain(
      'severity = LAST(severity, @timestamp) WHERE status == "breached" AND severity IS NOT NULL'
    );
    expect(queryString).toContain('BY `episode.id`');
    expect(queryString).toContain(
      'EVAL @timestamp = last_timestamp, duration = DATE_DIFF("ms", first_timestamp, last_timestamp)'
    );
  });

  it('derives the series id after the aggregation', () => {
    const queryString = buildEpisodeQuery(SPACE_ID, 'ep-1').print('basic');
    expect(queryString.indexOf('EVAL series_id =')).toBeGreaterThan(queryString.indexOf('STATS'));
    expect(queryString).not.toContain('rule_id');
  });

  it('keeps the episode event columns', () => {
    const queryString = buildEpisodeQuery(SPACE_ID, 'ep-1').print('basic');
    for (const field of EPISODE_EVENTS_FIELDS.filter((name) => !name.includes('.'))) {
      expect(queryString).toMatch(new RegExp(`KEEP [^|]*${field}`));
    }
    expect(queryString).not.toMatch(/KEEP [^|]*episode_data/);
  });
});

describe('buildEpisodeDataRequest', () => {
  it('reads the data of the latest episode event from _source', () => {
    const { query } = buildEpisodeDataRequest(SPACE_ID, 'ep-1');
    const queryString = query.print('basic');
    expect(queryString).toContain(`FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source`);
    expect(queryString).toContain(`space_id == "${SPACE_ID}"`);
    expect(queryString).toContain('episode.id == "ep-1"');
    expect(queryString).toContain('SORT @timestamp DESC | LIMIT 1');
    expect(queryString).toContain('EVAL episode_data = JSON_EXTRACT(_source, "data")');
    expect(queryString).toContain('KEEP @timestamp, episode_data');
  });

  it('parses _source only after picking the latest event', () => {
    const queryString = buildEpisodeDataRequest(SPACE_ID, 'ep-1').query.print('basic');
    expect(queryString.indexOf('JSON_EXTRACT')).toBeGreaterThan(queryString.indexOf('LIMIT 1'));
  });

  it('comes with a filter that skips the events without data, but keeps the breached ones', () => {
    expect(buildEpisodeDataRequest(SPACE_ID, 'ep-1').filter).toEqual(EPISODE_DATA_FILTER);
    expect(EPISODE_DATA_FILTER).toEqual({
      bool: {
        should: [{ term: { status: 'breached' } }, { exists: { field: 'data' } }],
        minimum_should_match: 1,
      },
    });
  });
});

describe('buildEpisodesDataRequest', () => {
  it('reads one latest event with data per episode', () => {
    const { query, filter } = buildEpisodesDataRequest(SPACE_ID, ['ep-1', 'ep-2']);
    const queryString = query.print('basic');
    expect(queryString).toContain(`FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source`);
    expect(queryString).toContain('episode.id IN ("ep-1", "ep-2")');
    expect(queryString).toContain('SORT @timestamp DESC | LIMIT 1 BY `episode.id`');
    expect(queryString.indexOf('JSON_EXTRACT')).toBeGreaterThan(queryString.indexOf('LIMIT 1 BY'));
    expect(queryString).toContain('KEEP `episode.id`, episode_data');
    expect(filter).toEqual(EPISODE_DATA_FILTER);
  });
});

describe('buildSeriesSnoozeQuery', () => {
  it('reads the snooze actions of the series group hash', () => {
    const queryString = buildSeriesSnoozeQuery(SPACE_ID, GROUP_HASH, SERIES_ID).print('basic');
    expect(queryString).toContain(`FROM ${ALERT_ACTIONS_DATA_STREAM}`);
    expect(queryString).not.toContain(ALERT_EVENTS_DATA_STREAM);
    expect(queryString).toContain(`space_id == "${SPACE_ID}"`);
    expect(queryString).toContain(`group_hash == "${GROUP_HASH}"`);
    expect(queryString).toContain('action_type IN ("snooze", "unsnooze")');
  });

  it('narrows to the series id after the indexed filters', () => {
    const queryString = buildSeriesSnoozeQuery(SPACE_ID, GROUP_HASH, SERIES_ID).print('basic');
    const groupHashFilterIndex = queryString.indexOf(`group_hash == "${GROUP_HASH}"`);
    const seriesFilterIndex = queryString.indexOf(`series_id == "${SERIES_ID}"`);
    expect(seriesFilterIndex).toBeGreaterThan(groupHashFilterIndex);
  });

  it('skips the series id filter when the series id is unknown', () => {
    const queryString = buildSeriesSnoozeQuery(SPACE_ID, GROUP_HASH, null).print('basic');
    expect(queryString).not.toContain('series_id');
  });

  it('returns the last snooze action and expiry', () => {
    const queryString = buildSeriesSnoozeQuery(SPACE_ID, GROUP_HASH, SERIES_ID).print('basic');
    expect(queryString).toContain('last_snooze_action = LAST(action_type, @timestamp)');
    expect(queryString).toContain(
      'snoozed_until = LAST(expiry, @timestamp) WHERE action_type == "snooze"'
    );
    expect(queryString).toContain('KEEP last_snooze_action, snoozed_until');
  });
});
