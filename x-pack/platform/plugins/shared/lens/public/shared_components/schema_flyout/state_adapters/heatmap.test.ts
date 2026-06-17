/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeatmapVisualizationState } from '@kbn/lens-common';
import { heatmapStateAdapter } from './heatmap';

const baseState: HeatmapVisualizationState = {
  layerId: 'layer1',
  layerType: 'data',
  shape: 'heatmap',
  legend: {
    type: 'heatmap_legend',
    isVisible: true,
    position: 'right',
  },
  gridConfig: {
    type: 'heatmap_grid',
    isCellLabelVisible: false,
    isXAxisLabelVisible: true,
    isXAxisTitleVisible: false,
    isYAxisLabelVisible: true,
    isYAxisTitleVisible: false,
  },
};

describe('heatmapStateAdapter', () => {
  describe('stateToFormValues', () => {
    it('converts legend visibility', () => {
      const result = heatmapStateAdapter.stateToFormValues(baseState);
      expect(result['legend.visibility']).toBe('visible');
    });

    it('converts hidden legend', () => {
      const state: HeatmapVisualizationState = {
        ...baseState,
        legend: { ...baseState.legend, isVisible: false },
      };
      const result = heatmapStateAdapter.stateToFormValues(state);
      expect(result['legend.visibility']).toBe('hidden');
    });

    it('converts legend position', () => {
      const state: HeatmapVisualizationState = {
        ...baseState,
        legend: { ...baseState.legend, position: 'bottom' },
      };
      const result = heatmapStateAdapter.stateToFormValues(state);
      expect(result['legend.position']).toBe('bottom');
    });

    it('converts cell label visibility', () => {
      const state: HeatmapVisualizationState = {
        ...baseState,
        gridConfig: { ...baseState.gridConfig, isCellLabelVisible: true },
      };
      const result = heatmapStateAdapter.stateToFormValues(state);
      expect(result['styling.cells.labels.visible']).toBe(true);
    });

    it('converts axis label visibility', () => {
      const result = heatmapStateAdapter.stateToFormValues(baseState);
      expect(result['axis.x.labels.visible']).toBe(true);
      expect(result['axis.y.labels.visible']).toBe(true);
    });

    it('converts axis title visibility', () => {
      const state: HeatmapVisualizationState = {
        ...baseState,
        gridConfig: { ...baseState.gridConfig, isXAxisTitleVisible: true, xTitle: 'My X' },
      };
      const result = heatmapStateAdapter.stateToFormValues(state);
      expect(result['axis.x.title.visible']).toBe(true);
      expect(result['axis.x.title.text']).toBe('My X');
    });

    it('converts x axis label rotation to orientation', () => {
      const state: HeatmapVisualizationState = {
        ...baseState,
        gridConfig: { ...baseState.gridConfig, xAxisLabelRotation: -90 },
      };
      const result = heatmapStateAdapter.stateToFormValues(state);
      expect(result['axis.x.labels.orientation']).toBe('vertical');
    });
  });

  describe('formValuesToState', () => {
    it('applies legend changes while preserving other state', () => {
      const formValues = { 'legend.visibility': 'hidden', 'legend.position': 'left' };
      const result = heatmapStateAdapter.formValuesToState(baseState, formValues);
      expect(result.legend.isVisible).toBe(false);
      expect(result.legend.position).toBe('left');
      // Preserves non-styling state
      expect(result.layerId).toBe('layer1');
      expect(result.shape).toBe('heatmap');
    });

    it('applies cell label visibility', () => {
      const formValues = { 'styling.cells.labels.visible': true };
      const result = heatmapStateAdapter.formValuesToState(baseState, formValues);
      expect(result.gridConfig.isCellLabelVisible).toBe(true);
    });

    it('applies axis orientation as rotation', () => {
      const formValues = { 'axis.x.labels.orientation': 'angled' };
      const result = heatmapStateAdapter.formValuesToState(baseState, formValues);
      expect(result.gridConfig.xAxisLabelRotation).toBe(-45);
    });

    it('round-trips state through form values', () => {
      const state: HeatmapVisualizationState = {
        ...baseState,
        legend: {
          ...baseState.legend,
          isVisible: true,
          position: 'bottom',
          maxLines: 2,
          shouldTruncate: true,
        },
        gridConfig: {
          ...baseState.gridConfig,
          isCellLabelVisible: true,
          isXAxisTitleVisible: true,
          xTitle: 'X Title',
          xAxisLabelRotation: -45,
        },
      };
      const formValues = heatmapStateAdapter.stateToFormValues(state);
      const result = heatmapStateAdapter.formValuesToState(baseState, formValues);
      expect(result.legend.isVisible).toBe(true);
      expect(result.legend.position).toBe('bottom');
      expect(result.legend.maxLines).toBe(2);
      expect(result.gridConfig.isCellLabelVisible).toBe(true);
      expect(result.gridConfig.isXAxisTitleVisible).toBe(true);
      expect(result.gridConfig.xTitle).toBe('X Title');
      expect(result.gridConfig.xAxisLabelRotation).toBe(-45);
    });
  });
});
