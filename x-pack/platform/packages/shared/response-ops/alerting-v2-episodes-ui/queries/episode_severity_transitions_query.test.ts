/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_FIELD } from '../constants';
import { buildEpisodeSeverityTransitionsEsqlQuery } from './episode_severity_transitions_query';

const SPACE_ID = 'default';

describe('buildEpisodeSeverityTransitionsEsqlQuery', () => {
  it('filters by episode id and returns the minimal severity series sorted by time ascending', () => {
    const episodeId = 'episode-xyz';
    const queryString = buildEpisodeSeverityTransitionsEsqlQuery(SPACE_ID, episodeId).print(
      'basic'
    );

    expect(queryString).toContain('episode.id');
    expect(queryString).toContain(episodeId);
    expect(queryString).toContain('severity IS NOT NULL');
    expect(queryString).toContain('STATS event_count = COUNT(*) BY @timestamp, severity');
    expect(queryString).toContain(`SORT ${TIME_FIELD} ASC`);
    expect(queryString).toContain('event_count');
    expect(queryString).not.toContain('episode.status');
    expect(queryString).not.toContain('data');
  });
});
