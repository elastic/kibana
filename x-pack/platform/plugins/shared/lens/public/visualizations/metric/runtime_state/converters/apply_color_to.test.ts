/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';
import { LENS_METRIC_STATE_DEFAULTS } from '@kbn/lens-common';
import { convertApplyColorTo } from './apply_color_to';

const baseState: MetricVisualizationState = {
  layerId: 'layer-1',
  layerType: 'data',
};

describe('convertApplyColorTo', () => {
  it('should set applyColorTo to the default when color is set but applyColorTo is undefined', () => {
    const state: MetricVisualizationState = {
      ...baseState,
      color: '#ff0000',
      applyColorTo: undefined,
    };
    expect(convertApplyColorTo(state)).toEqual({
      ...state,
      applyColorTo: LENS_METRIC_STATE_DEFAULTS.applyColorTo,
    });
  });

  it('should set applyColorTo to the default when palette is set but applyColorTo is undefined', () => {
    const state: MetricVisualizationState = {
      ...baseState,
      palette: { type: 'palette', name: 'custom', params: { rangeType: 'percent', stops: [] } },
      applyColorTo: undefined,
    };
    expect(convertApplyColorTo(state)).toEqual({
      ...state,
      applyColorTo: LENS_METRIC_STATE_DEFAULTS.applyColorTo,
    });
  });

  it('should not modify state when applyColorTo is already set', () => {
    const state: MetricVisualizationState = {
      ...baseState,
      color: '#ff0000',
      applyColorTo: 'value',
    };
    expect(convertApplyColorTo(state)).toBe(state);
  });

  it('should not modify state when applyColorTo, color, and palette are all undefined', () => {
    const state: MetricVisualizationState = {
      ...baseState,
      applyColorTo: undefined,
      color: undefined,
      palette: undefined,
    };
    expect(convertApplyColorTo(state)).toBe(state);
  });

  it('should return the same reference when no conversion is needed', () => {
    const state: MetricVisualizationState = {
      ...baseState,
      applyColorTo: 'background',
      color: '#ff0000',
    };
    expect(convertApplyColorTo(state)).toBe(state);
  });
});
