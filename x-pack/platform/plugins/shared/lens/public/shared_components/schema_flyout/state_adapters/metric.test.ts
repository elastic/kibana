/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';
import { metricStateAdapter } from './metric';

const baseState: MetricVisualizationState = {
  layerId: 'layer1',
  layerType: 'data',
  metricAccessor: 'metric1',
};

describe('metricStateAdapter', () => {
  describe('stateToFormValues', () => {
    it('converts primary position to API form values', () => {
      const state: MetricVisualizationState = {
        ...baseState,
        primaryPosition: 'top',
      };
      const result = metricStateAdapter.stateToFormValues(state);
      expect(result['styling.primary.position']).toBe('top');
    });

    it('converts primary value alignment to API form values', () => {
      const state: MetricVisualizationState = {
        ...baseState,
        primaryAlign: 'left',
      };
      const result = metricStateAdapter.stateToFormValues(state);
      expect(result['styling.primary.value.alignment']).toBe('left');
    });

    it('converts icon to API form values', () => {
      const state: MetricVisualizationState = {
        ...baseState,
        icon: 'sortUp',
        iconAlign: 'left',
      };
      const result = metricStateAdapter.stateToFormValues(state);
      expect(result['styling.icon.name']).toBe('sort_up');
      expect(result['styling.icon.alignment']).toBe('left');
    });

    it('converts valueFontMode to API sizing format', () => {
      const state: MetricVisualizationState = {
        ...baseState,
        valueFontMode: 'fit',
      };
      const result = metricStateAdapter.stateToFormValues(state);
      expect(result['styling.primary.value.sizing']).toBe('fill');
    });

    it('returns default values when no styling is set', () => {
      const result = metricStateAdapter.stateToFormValues(baseState);
      // Should still produce defaults for primary position, alignment, etc.
      expect(result['styling.primary.position']).toBeDefined();
    });
  });

  describe('formValuesToState', () => {
    it('converts API position back to internal state', () => {
      const result = metricStateAdapter.formValuesToState(baseState, {
        'styling.primary.position': 'bottom',
      });
      expect(result.primaryPosition).toBe('bottom');
      expect(result.layerId).toBe('layer1');
    });

    it('converts API icon back to internal state', () => {
      const result = metricStateAdapter.formValuesToState(baseState, {
        'styling.icon.name': 'sort_up',
        'styling.icon.alignment': 'left',
        'styling.primary.position': 'top',
      });
      expect(result.icon).toBe('sortUp');
      expect(result.iconAlign).toBe('left');
    });

    it('preserves non-styling properties', () => {
      const stateWithExtras: MetricVisualizationState = {
        ...baseState,
        subtitle: 'My subtitle',
        color: '#ff0000',
      };
      const result = metricStateAdapter.formValuesToState(stateWithExtras, {
        'styling.primary.position': 'top',
      });
      expect(result.subtitle).toBe('My subtitle');
      expect(result.color).toBe('#ff0000');
    });
  });

  describe('round-trip', () => {
    it('preserves styling through stateToFormValues → formValuesToState', () => {
      const state: MetricVisualizationState = {
        ...baseState,
        primaryPosition: 'top',
        primaryAlign: 'center',
        titlesTextAlign: 'right',
        valueFontMode: 'fit',
      };

      const formValues = metricStateAdapter.stateToFormValues(state);
      const result = metricStateAdapter.formValuesToState(baseState, formValues);

      expect(result.primaryPosition).toBe('top');
      expect(result.primaryAlign).toBe('center');
      expect(result.titlesTextAlign).toBe('right');
      expect(result.valueFontMode).toBe('fit');
    });
  });
});
