/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';
import type { MetricVisualizationStateWithLegacyTitleWeight } from './remove_legacy_title_weight';
import { removeLegacyTitleWeight } from './remove_legacy_title_weight';

const baseState: MetricVisualizationState = {
  layerId: 'layer-1',
  layerType: 'data',
};

describe('removeLegacyTitleWeight', () => {
  it('should strip the titleWeight property when present', () => {
    const state = {
      ...baseState,
      titleWeight: 'bold',
    } satisfies MetricVisualizationStateWithLegacyTitleWeight;
    const result = removeLegacyTitleWeight(state);
    expect(result).not.toHaveProperty('titleWeight');
    expect(result).toEqual(baseState);
  });

  it('should return the same reference when titleWeight is absent', () => {
    expect(removeLegacyTitleWeight(baseState)).toBe(baseState);
  });
});
