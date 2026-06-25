/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '../constants';
import { buildEpisodeTrendQuery } from './episode_trend_query';

const SPACE_ID = 'default';

describe('buildEpisodeTrendQuery', () => {
  it('queries the alert events data stream with _source metadata', () => {
    const queryString = buildEpisodeTrendQuery(SPACE_ID, 'ep-1').print('basic');
    expect(queryString).toContain(ALERT_EVENTS_DATA_STREAM);
    expect(queryString).toContain('_source');
  });

  it('filters by space, alert type and episode id', () => {
    const episodeId = 'episode-abc';
    const queryString = buildEpisodeTrendQuery(SPACE_ID, episodeId).print('basic');
    expect(queryString).toContain('space_id');
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain('episode.id');
    expect(queryString).toContain(episodeId);
  });

  it('extracts the evaluated data row via JSON_EXTRACT', () => {
    const queryString = buildEpisodeTrendQuery(SPACE_ID, 'ep-1').print('basic');
    expect(queryString.toUpperCase()).toContain('JSON_EXTRACT');
    expect(queryString).toContain('extracted_data');
  });

  it('keeps the timestamp, status and data columns, sorted oldest first', () => {
    const queryString = buildEpisodeTrendQuery(SPACE_ID, 'ep-1').print('basic');
    expect(queryString).toContain('@timestamp');
    expect(queryString).toContain('episode.status');
    expect(queryString.toUpperCase()).toContain('SORT');
    expect(queryString.toUpperCase()).toContain('ASC');
    expect(queryString.toUpperCase()).toContain('KEEP');
  });
});
