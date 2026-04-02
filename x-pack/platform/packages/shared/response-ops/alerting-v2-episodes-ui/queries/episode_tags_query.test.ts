/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_FIELD } from '../constants';
import { buildEpisodeTagsEsqlQuery } from './episode_tags_query';

describe('buildEpisodeTagsEsqlQuery', () => {
  it('returns the latest alert-actions row for the episode', () => {
    const episodeId = 'ep-1';
    const queryString = buildEpisodeTagsEsqlQuery(episodeId).print('basic');
    expect(queryString).toContain('episode_id');
    expect(queryString).toContain(episodeId);
    expect(queryString).toContain(`SORT ${TIME_FIELD} DESC`);
    expect(queryString).toContain('LIMIT 1');
  });
});
