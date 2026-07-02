/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_FIELD } from '../constants';
import { buildEpisodeStateTransitionsEsqlQuery } from './episode_state_transitions_query';

const SPACE_ID = 'default';

describe('buildEpisodeStateTransitionsEsqlQuery', () => {
  it('filters by episode id and returns the minimal status series sorted by time ascending', () => {
    const episodeId = 'episode-xyz';
    const queryString = buildEpisodeStateTransitionsEsqlQuery(SPACE_ID, episodeId).print('basic');

    expect(queryString).toContain('episode.id');
    expect(queryString).toContain(episodeId);
    expect(queryString).toContain('STATS event_count = COUNT(*) BY @timestamp, `episode.status`');
    expect(queryString).toContain(`SORT ${TIME_FIELD} ASC`);
    expect(queryString).toContain('event_count');
    expect(queryString).not.toContain('severity');
    expect(queryString).not.toContain('data');
  });
});
