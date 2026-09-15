/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_TIME_FIELD } from '@kbn/alerting-v2-constants';
import { buildEpisodeFlappingQuery } from './episode_flapping_query';

const SPACE_ID = 'default';

describe('buildEpisodeFlappingQuery', () => {
  it('filters by episode id, sorts by time descending and limits to the look-back window', () => {
    const episodeId = 'episode-xyz';
    const queryString = buildEpisodeFlappingQuery(SPACE_ID, episodeId, 20).print('basic');
    expect(queryString).toContain('episode.id');
    expect(queryString).toContain(episodeId);
    expect(queryString).toContain(`SORT ${DEFAULT_TIME_FIELD} DESC`);
    expect(queryString).toContain('LIMIT 20');
    expect(queryString).toContain('episode.status');
  });
});
