/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';
import { convertSpacing } from './spacing';

const baseState: MetricVisualizationState = {
  layerId: 'layer-1',
  layerType: 'data',
};

describe('convertSpacing', () => {
  it('should set spacing to small for legacy states where spacing is undefined', () => {
    expect(convertSpacing(baseState)).toEqual({
      ...baseState,
      spacing: 'small',
    });
  });

  it('should preserve explicit small spacing', () => {
    const state: MetricVisualizationState = {
      ...baseState,
      spacing: 'small',
    };
    expect(convertSpacing(state)).toBe(state);
  });

  it('should preserve explicit large spacing', () => {
    const state: MetricVisualizationState = {
      ...baseState,
      spacing: 'large',
    };
    expect(convertSpacing(state)).toBe(state);
  });
});
