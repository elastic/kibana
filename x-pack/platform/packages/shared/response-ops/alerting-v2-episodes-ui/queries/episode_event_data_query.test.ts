/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '../constants';
import { buildEpisodeEventDataQuery } from './episode_event_data_query';

describe('buildEpisodeEventDataQuery', () => {
  it('queries the alert events data stream with _source metadata', () => {
    const queryString = buildEpisodeEventDataQuery('ep-1').print('basic');
    expect(queryString).toContain(ALERT_EVENTS_DATA_STREAM);
    expect(queryString).toContain('_source');
  });

  it('filters by episode id', () => {
    const episodeId = 'episode-abc';
    const queryString = buildEpisodeEventDataQuery(episodeId).print('basic');
    expect(queryString).toContain('episode.id');
    expect(queryString).toContain(episodeId);
  });

  it('extracts data via JSON_EXTRACT and uses INLINE STATS LAST to skip empty events', () => {
    const queryString = buildEpisodeEventDataQuery('ep-1').print('basic');
    expect(queryString.toUpperCase()).toContain('JSON_EXTRACT');
    expect(queryString.toUpperCase()).toContain('INLINE STATS');
    expect(queryString.toUpperCase()).toContain('LAST');
    expect(queryString).toContain('last_data');
  });

  it('aggregates data and event timestamps so callers can detect stale data', () => {
    const queryString = buildEpisodeEventDataQuery('ep-1').print('basic');
    expect(queryString).toContain('last_data_timestamp = MAX(@timestamp)');
    expect(queryString).toContain('last_event_timestamp = MAX(@timestamp)');
  });
});
