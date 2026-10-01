/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTIONS_DATA_STREAM, ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { buildEpisodeQuery, buildEpisodeGroupHashQuery } from './episode_query';

const SPACE_ID = 'default';
const GROUP_HASH = 'group-hash-1';

describe('buildEpisodeQuery', () => {
  it('filters by episode id', () => {
    const episodeId = 'episode-abc';
    const queryString = buildEpisodeQuery(SPACE_ID, episodeId, GROUP_HASH).print('basic');
    expect(queryString).toContain(`episode.id == "${episodeId}"`);
  });

  it('narrows to the episode group hash before the aggregations', () => {
    const queryString = buildEpisodeQuery(SPACE_ID, 'ep-1', GROUP_HASH).print('basic');
    const groupHashFilterIndex = queryString.indexOf(`group_hash == "${GROUP_HASH}"`);
    const firstInlineStatsIndex = queryString.indexOf('INLINE STATS');
    expect(groupHashFilterIndex).toBeGreaterThan(-1);
    expect(firstInlineStatsIndex).toBeGreaterThan(-1);
    expect(groupHashFilterIndex).toBeLessThan(firstInlineStatsIndex);
  });

  it('limits to 1 row', () => {
    const queryString = buildEpisodeQuery(SPACE_ID, 'ep-1', GROUP_HASH).print('basic');
    expect(queryString).toContain('LIMIT 1');
  });

  it('joins both data streams', () => {
    const queryString = buildEpisodeQuery(SPACE_ID, 'ep-1', GROUP_HASH).print('basic');
    expect(queryString).toContain(ALERT_EVENTS_DATA_STREAM);
    expect(queryString).toContain(ALERT_ACTIONS_DATA_STREAM);
  });

  it('computes triggered_at from first active event', () => {
    const queryString = buildEpisodeQuery(SPACE_ID, 'ep-1', GROUP_HASH).print('basic');
    expect(queryString).toContain('triggered_at');
    expect(queryString).toContain('"active"');
  });

  it('aggregates severity from breached rule events', () => {
    const queryString = buildEpisodeQuery(SPACE_ID, 'ep-1', GROUP_HASH).print('basic');
    expect(queryString).toContain(
      'severity = LAST(severity, @timestamp) WHERE status == "breached" AND severity IS NOT NULL'
    );
    expect(queryString).toContain('KEEP');
    expect(queryString).toContain('severity');
  });
});

describe('buildEpisodeGroupHashQuery', () => {
  it('resolves the group hash from the latest rule event of the episode', () => {
    const queryString = buildEpisodeGroupHashQuery(SPACE_ID, 'ep-1').print('basic');
    expect(queryString).toContain(ALERT_EVENTS_DATA_STREAM);
    expect(queryString).not.toContain(ALERT_ACTIONS_DATA_STREAM);
    expect(queryString).toContain(`space_id == "${SPACE_ID}"`);
    expect(queryString).toContain('episode.id == "ep-1"');
    expect(queryString).toContain('SORT @timestamp DESC');
    expect(queryString).toContain('LIMIT 1');
    expect(queryString).toContain('KEEP group_hash');
  });
});
