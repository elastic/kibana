/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XYVisualizationState } from '@kbn/lens-common';
import { xyStateAdapter } from './xy';

const baseState: XYVisualizationState = {
  preferredSeriesType: 'bar',
  legend: { isVisible: true, position: 'right' },
  layers: [],
};

describe('xyStateAdapter', () => {
  describe('stateToFormValues', () => {
    it('converts legend visibility', () => {
      const result = xyStateAdapter.stateToFormValues(baseState);
      expect(result['legend.visibility']).toBeDefined();
    });

    it('converts hidden legend', () => {
      const state: XYVisualizationState = {
        ...baseState,
        legend: { isVisible: false, position: 'right' },
      };
      const result = xyStateAdapter.stateToFormValues(state);
      expect(result['legend.visibility']).toBe('hidden');
    });

    it('converts styling properties', () => {
      const state: XYVisualizationState = {
        ...baseState,
        hideEndzones: true,
        showCurrentTimeMarker: true,
        curveType: 'CURVE_MONOTONE_X',
      };
      const result = xyStateAdapter.stateToFormValues(state);
      expect(result['styling.overlays.partial_buckets.visible']).toBe(false);
      expect(result['styling.overlays.current_time_marker.visible']).toBe(true);
    });
  });

  describe('formValuesToState', () => {
    it('converts legend form values back to state', () => {
      const result = xyStateAdapter.formValuesToState(baseState, {
        'legend.visibility': 'hidden',
      });
      expect(result.legend.isVisible).toBe(false);
    });

    it('converts styling form values back to state', () => {
      const result = xyStateAdapter.formValuesToState(baseState, {
        'styling.overlays.partial_buckets.visible': false,
        'styling.overlays.current_time_marker.visible': true,
      });
      expect(result.hideEndzones).toBe(true);
      expect(result.showCurrentTimeMarker).toBe(true);
    });

    it('preserves non-styling properties', () => {
      const state: XYVisualizationState = {
        ...baseState,
        layers: [
          {
            layerId: 'layer1',
            layerType: 'data',
            seriesType: 'bar',
            accessors: ['col1'],
          } as XYVisualizationState['layers'][0],
        ],
      };
      const result = xyStateAdapter.formValuesToState(state, {
        'styling.overlays.current_time_marker.visible': true,
      });
      expect(result.layers).toHaveLength(1);
      expect(result.preferredSeriesType).toBe('bar');
    });
  });

  describe('round-trip', () => {
    it('preserves styling through stateToFormValues → formValuesToState', () => {
      const state: XYVisualizationState = {
        ...baseState,
        legend: { isVisible: true, position: 'bottom' },
        hideEndzones: true,
        showCurrentTimeMarker: true,
        fillOpacity: 0.5,
      };

      const formValues = xyStateAdapter.stateToFormValues(state);
      const result = xyStateAdapter.formValuesToState(baseState, formValues);

      expect(result.hideEndzones).toBe(true);
      expect(result.showCurrentTimeMarker).toBe(true);
      expect(result.legend.isVisible).toBe(true);
    });
  });
});
