/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GaugeVisualizationState } from '@kbn/lens-common';
import { gaugeStateAdapter } from './gauge';

const baseState: GaugeVisualizationState = {
  layerId: 'layer1',
  layerType: 'data',
  metricAccessor: 'metric1',
  shape: 'horizontalBullet',
  ticksPosition: 'auto',
  labelMajorMode: 'auto',
};

describe('gaugeStateAdapter', () => {
  describe('stateToFormValues', () => {
    it('converts horizontal bullet shape to API form values', () => {
      const result = gaugeStateAdapter.stateToFormValues(baseState);
      expect(result['styling.shape.type']).toBe('bullet');
      expect(result['styling.shape.orientation']).toBe('horizontal');
    });

    it('converts vertical bullet shape to API form values', () => {
      const state: GaugeVisualizationState = {
        ...baseState,
        shape: 'verticalBullet',
      };
      const result = gaugeStateAdapter.stateToFormValues(state);
      expect(result['styling.shape.type']).toBe('bullet');
      expect(result['styling.shape.orientation']).toBe('vertical');
    });

    it('converts circle shape to API form values', () => {
      const state: GaugeVisualizationState = {
        ...baseState,
        shape: 'circle',
      };
      const result = gaugeStateAdapter.stateToFormValues(state);
      expect(result['styling.shape.type']).toBe('circle');
    });

    it('converts semiCircle shape to API form values', () => {
      const state: GaugeVisualizationState = {
        ...baseState,
        shape: 'semiCircle',
      };
      const result = gaugeStateAdapter.stateToFormValues(state);
      expect(result['styling.shape.type']).toBe('semi_circle');
    });
  });

  describe('formValuesToState', () => {
    it('converts API bullet shape back to internal state', () => {
      const result = gaugeStateAdapter.formValuesToState(baseState, {
        'styling.shape.type': 'bullet',
        'styling.shape.orientation': 'vertical',
      });
      expect(result.shape).toBe('verticalBullet');
      expect(result.layerId).toBe('layer1');
    });

    it('converts API circle shape back to internal state', () => {
      const result = gaugeStateAdapter.formValuesToState(baseState, {
        'styling.shape.type': 'circle',
      });
      expect(result.shape).toBe('circle');
    });

    it('converts API semi_circle shape back to internal state', () => {
      const result = gaugeStateAdapter.formValuesToState(baseState, {
        'styling.shape.type': 'semi_circle',
      });
      expect(result.shape).toBe('semiCircle');
    });

    it('preserves non-styling properties', () => {
      const stateWithExtras: GaugeVisualizationState = {
        ...baseState,
        ticksPosition: 'bands',
        labelMajorMode: 'custom',
        labelMajor: 'My Gauge',
      };
      const result = gaugeStateAdapter.formValuesToState(stateWithExtras, {
        'styling.shape.type': 'arc',
      });
      expect(result.ticksPosition).toBe('bands');
      expect(result.labelMajor).toBe('My Gauge');
    });
  });

  describe('round-trip', () => {
    it('preserves styling through stateToFormValues → formValuesToState', () => {
      const state: GaugeVisualizationState = {
        ...baseState,
        shape: 'verticalBullet',
      };

      const formValues = gaugeStateAdapter.stateToFormValues(state);
      const result = gaugeStateAdapter.formValuesToState(baseState, formValues);

      expect(result.shape).toBe('verticalBullet');
    });
  });
});
