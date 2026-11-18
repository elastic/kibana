/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { withFlattenedEpisodeData } from './with_flattened_episode_data';

const makeHit = (flattened: Record<string, unknown>) =>
  ({ id: '0', raw: {}, flattened } as DataTableRecord);

describe('withFlattenedEpisodeData', () => {
  it('splits the episode data into one data field per value', () => {
    const hit = makeHit({
      'episode.id': 'ep-1',
      episode_data: JSON.stringify({ host: { name: 'web-1', cpu: 0.9 }, tags: ['a', 'b'] }),
    });

    expect(withFlattenedEpisodeData(hit).flattened).toEqual({
      'episode.id': 'ep-1',
      'data.host.name': 'web-1',
      'data.host.cpu': 0.9,
      'data.tags': ['a', 'b'],
    });
  });

  it('drops episode data that is empty or not valid JSON', () => {
    expect(withFlattenedEpisodeData(makeHit({ episode_data: null })).flattened).toEqual({});
    expect(withFlattenedEpisodeData(makeHit({ episode_data: '{oops' })).flattened).toEqual({});
  });

  it('returns rows without episode data unchanged', () => {
    const hit = makeHit({ 'episode.id': 'ep-1' });

    expect(withFlattenedEpisodeData(hit)).toBe(hit);
  });
});
