/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';
import { convertDensity } from './density';

const baseState: MetricVisualizationState = {
  layerId: 'layer-1',
  layerType: 'data',
};

describe('convertDensity', () => {
  it('should set density to compact for legacy states where density is undefined', () => {
    expect(convertDensity(baseState)).toEqual({
      ...baseState,
      density: 'compact',
    });
  });

  it('should preserve explicit compact density', () => {
    const state = {
      ...baseState,
      density: 'compact',
    } as const;
    expect(convertDensity(state)).toBe(state);
  });

  it('should preserve explicit default density', () => {
    const state = {
      ...baseState,
      density: 'default',
    } as const;
    expect(convertDensity(state)).toBe(state);
  });
});
