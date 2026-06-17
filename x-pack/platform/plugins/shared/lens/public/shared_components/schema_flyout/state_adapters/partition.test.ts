/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensPartitionVisualizationState } from '@kbn/lens-common';
import { PARTITION_EMPTY_SIZE_RADIUS } from '@kbn/lens-common';
import { partitionStateAdapter } from './partition';

const baseLayer = {
  layerId: 'layer1',
  layerType: 'data' as const,
  metrics: ['m1'],
  primaryGroups: ['g1'],
  numberDisplay: 'percent' as const,
  categoryDisplay: 'default' as const,
  legendDisplay: 'default' as const,
};

const baseState: LensPartitionVisualizationState = {
  shape: 'pie',
  layers: [baseLayer],
};

describe('partitionStateAdapter', () => {
  describe('stateToFormValues', () => {
    it('converts value display to API format', () => {
      const result = partitionStateAdapter.stateToFormValues(baseState);
      expect(result['styling.values.visible']).toBe(true);
      expect(result['styling.values.mode']).toBe('percentage');
    });

    it('converts hidden values', () => {
      const state: LensPartitionVisualizationState = {
        ...baseState,
        layers: [{ ...baseLayer, numberDisplay: 'hidden' }],
      };
      const result = partitionStateAdapter.stateToFormValues(state);
      expect(result['styling.values.visible']).toBe(false);
    });

    it('converts donut hole size', () => {
      const state: LensPartitionVisualizationState = {
        shape: 'donut',
        layers: [{ ...baseLayer, emptySizeRatio: PARTITION_EMPTY_SIZE_RADIUS.MEDIUM }],
      };
      const result = partitionStateAdapter.stateToFormValues(state);
      expect(result['styling.donut_hole']).toBe('m');
    });

    it('converts pie with no donut hole', () => {
      const result = partitionStateAdapter.stateToFormValues(baseState);
      expect(result['styling.donut_hole']).toBe('none');
    });

    it('converts label position for pie', () => {
      const state: LensPartitionVisualizationState = {
        ...baseState,
        layers: [{ ...baseLayer, categoryDisplay: 'inside' }],
      };
      const result = partitionStateAdapter.stateToFormValues(state);
      expect(result['styling.labels.visible']).toBe(true);
      expect(result['styling.labels.position']).toBe('inside');
    });

    it('converts hidden labels', () => {
      const state: LensPartitionVisualizationState = {
        ...baseState,
        layers: [{ ...baseLayer, categoryDisplay: 'hide' }],
      };
      const result = partitionStateAdapter.stateToFormValues(state);
      expect(result['styling.labels.visible']).toBe(false);
    });

    it('converts legend settings', () => {
      const state: LensPartitionVisualizationState = {
        ...baseState,
        layers: [
          {
            ...baseLayer,
            legendDisplay: 'show',
            nestedLegend: true,
            truncateLegend: true,
            legendMaxLines: 3,
          },
        ],
      };
      const result = partitionStateAdapter.stateToFormValues(state);
      expect(result['legend.visibility']).toBe('visible');
      expect(result['legend.nested']).toBe(true);
      expect(result['legend.truncate_after_lines']).toBe(3);
    });

    it('omits nested legend for waffle charts', () => {
      const state: LensPartitionVisualizationState = {
        shape: 'waffle',
        layers: [{ ...baseLayer, nestedLegend: true }],
      };
      const result = partitionStateAdapter.stateToFormValues(state);
      expect(result['legend.nested']).toBeUndefined();
    });
  });

  describe('formValuesToState', () => {
    it('applies value display changes', () => {
      const result = partitionStateAdapter.formValuesToState(baseState, {
        'styling.values.visible': false,
      });
      expect(result.layers[0].numberDisplay).toBe('hidden');
    });

    it('applies donut hole and changes shape to donut', () => {
      const result = partitionStateAdapter.formValuesToState(baseState, {
        'styling.donut_hole': 'm',
        'styling.values.visible': true,
        'styling.values.mode': 'percentage',
        'styling.labels.visible': true,
        'styling.labels.position': 'outside',
      });
      expect(result.shape).toBe('donut');
      expect(result.layers[0].emptySizeRatio).toBe(PARTITION_EMPTY_SIZE_RADIUS.MEDIUM);
    });

    it('changes shape back to pie when donut_hole is none', () => {
      const donutState: LensPartitionVisualizationState = {
        shape: 'donut',
        layers: [{ ...baseLayer, emptySizeRatio: PARTITION_EMPTY_SIZE_RADIUS.MEDIUM }],
      };
      const result = partitionStateAdapter.formValuesToState(donutState, {
        'styling.donut_hole': 'none',
        'styling.values.visible': true,
        'styling.values.mode': 'percentage',
        'styling.labels.visible': true,
        'styling.labels.position': 'outside',
      });
      expect(result.shape).toBe('pie');
      expect(result.layers[0].emptySizeRatio).toBeUndefined();
    });

    it('applies legend changes', () => {
      const result = partitionStateAdapter.formValuesToState(baseState, {
        'legend.visibility': 'hidden',
        'legend.nested': true,
        'legend.truncate_after_lines': 2,
      });
      expect(result.layers[0].legendDisplay).toBe('hide');
      expect(result.layers[0].nestedLegend).toBe(true);
      expect(result.layers[0].legendMaxLines).toBe(2);
    });

    it('preserves non-styling state', () => {
      const result = partitionStateAdapter.formValuesToState(baseState, {
        'styling.values.visible': true,
        'styling.values.mode': 'percentage',
      });
      expect(result.layers[0].metrics).toEqual(['m1']);
      expect(result.layers[0].primaryGroups).toEqual(['g1']);
      expect(result.layers[0].layerId).toBe('layer1');
    });

    it('roundtrips: stateToFormValues → formValuesToState preserves state', () => {
      const state: LensPartitionVisualizationState = {
        shape: 'donut',
        layers: [
          {
            ...baseLayer,
            numberDisplay: 'value',
            categoryDisplay: 'inside',
            legendDisplay: 'show',
            nestedLegend: true,
            emptySizeRatio: PARTITION_EMPTY_SIZE_RADIUS.LARGE,
            truncateLegend: true,
            legendMaxLines: 2,
          },
        ],
      };
      const formValues = partitionStateAdapter.stateToFormValues(state);
      const roundtripped = partitionStateAdapter.formValuesToState(state, formValues);
      expect(roundtripped.shape).toBe('donut');
      expect(roundtripped.layers[0].numberDisplay).toBe('value');
      expect(roundtripped.layers[0].categoryDisplay).toBe('inside');
      expect(roundtripped.layers[0].legendDisplay).toBe('show');
      expect(roundtripped.layers[0].nestedLegend).toBe(true);
      expect(roundtripped.layers[0].emptySizeRatio).toBe(PARTITION_EMPTY_SIZE_RADIUS.LARGE);
    });
  });
});
