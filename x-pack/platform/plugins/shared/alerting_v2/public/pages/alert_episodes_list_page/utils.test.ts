/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertEpisodeToDataTableRecord } from './utils';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';

describe('alertEpisodeToDataTableRecord', () => {
  const mockEpisode = {
    'episode.id': 'ep1',
    'rule.id': 'rule1',
    group_hash: 'gh1',
    '@timestamp': '2026-04-13T00:00:00.000Z',
  } as AlertEpisode;

  it('uses the row index as the record id', () => {
    expect(alertEpisodeToDataTableRecord(mockEpisode, 3).id).toBe('3');
  });

  it('sets raw to an empty object', () => {
    expect(alertEpisodeToDataTableRecord(mockEpisode, 0).raw).toEqual({});
  });

  it('flattens all episode fields into the flattened map', () => {
    const record = alertEpisodeToDataTableRecord(mockEpisode, 0);
    expect(record.flattened['episode.id']).toBe('ep1');
    expect(record.flattened['rule.id']).toBe('rule1');
    expect(record.flattened.group_hash).toBe('gh1');
  });
});
