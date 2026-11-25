/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from './feature';
import { groupFeaturesAcrossSources } from './feature_aggregation';

const makeFeature = (overrides: Partial<Feature> & Pick<Feature, 'id' | 'source_id'>): Feature => ({
  uuid: `${overrides.source_id}:${overrides.id}`,
  type: 'technology',
  description: 'desc',
  properties: {},
  confidence: 50,
  ...overrides,
});

describe('groupFeaturesAcrossSources', () => {
  it('folds the same type and slug across sources behind the most confident instance', () => {
    const [row, ...rest] = groupFeaturesAcrossSources([
      makeFeature({ id: 'redis', source_id: 'b', confidence: 60 }),
      makeFeature({ id: 'Redis', source_id: 'a', confidence: 90, title: 'Redis' }),
      makeFeature({ id: 'redis', source_id: 'c', confidence: 60, updated_at: '2026-02-01' }),
    ]);

    expect(rest).toEqual([]);
    expect(row).toMatchObject({ id: 'Redis', source_id: 'a', title: 'Redis' });
    expect(row.sources).toEqual(['a', 'b', 'c']);
    expect(row.instances.map(({ source_id: sourceId }) => sourceId)).toEqual(['a', 'c', 'b']);
  });

  it('does not fold across a different type or exclusion state', () => {
    const rows = groupFeaturesAcrossSources([
      makeFeature({ id: 'redis', source_id: 'a', type: 'technology' }),
      makeFeature({ id: 'redis', source_id: 'b', type: 'entity' }),
      makeFeature({ id: 'redis', source_id: 'c', type: 'technology', excluded: true }),
    ]);

    expect(rows.map(({ sources }) => sources)).toEqual([['a'], ['b'], ['c']]);
  });

  it('never folds computed features', () => {
    const rows = groupFeaturesAcrossSources([
      makeFeature({ id: 'dataset_analysis', source_id: 'a', type: 'dataset_analysis', uuid: 'u' }),
      makeFeature({ id: 'dataset_analysis', source_id: 'b', type: 'dataset_analysis', uuid: 'u' }),
    ]);

    expect(rows.map(({ sources }) => sources)).toEqual([['a'], ['b']]);
  });
});
