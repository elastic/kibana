/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getActiveAiIndices } from './ai_indices';

describe('getActiveAiIndices', () => {
  it('lists inherited AI indices before assigned ones', () => {
    expect(getActiveAiIndices({ assigned: ['sales'], inherited: ['elastic'] })).toEqual([
      'elastic',
      'sales',
    ]);
  });

  it('counts an id in both layers once', () => {
    expect(getActiveAiIndices({ assigned: ['elastic', 'sales'], inherited: ['elastic'] })).toEqual([
      'elastic',
      'sales',
    ]);
  });

  it('returns an empty list when neither layer contributes', () => {
    expect(getActiveAiIndices({})).toEqual([]);
  });

  it('treats a missing layer as contributing nothing', () => {
    expect(getActiveAiIndices({ assigned: ['sales'] })).toEqual(['sales']);
    expect(getActiveAiIndices({ inherited: ['elastic'] })).toEqual(['elastic']);
  });
});
