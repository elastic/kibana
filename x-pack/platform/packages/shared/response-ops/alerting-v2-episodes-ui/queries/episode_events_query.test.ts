/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_FIELD } from '../constants';
import { buildEpisodeEventsEsqlQuery } from './episode_events_query';

describe('buildEpisodeEventsEsqlQuery', () => {
  it('filters by episode id and sorts by time ascending', () => {
    const episodeId = 'episode-xyz';
    const queryString = buildEpisodeEventsEsqlQuery(episodeId).print('basic');
    expect(queryString).toContain('episode.id');
    expect(queryString).toContain(episodeId);
    expect(queryString).toContain(`SORT ${TIME_FIELD} ASC`);
  });
});
