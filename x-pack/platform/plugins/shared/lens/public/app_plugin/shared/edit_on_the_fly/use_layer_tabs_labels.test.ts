/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { LensLayerType } from '@kbn/lens-common';
import { useGetLayerTabsLabel } from './use_layer_tabs_labels';

describe('useGetLayerTabsLabel', () => {
  const createLayerConfig = (
    layerId: string,
    layerType?: LensLayerType,
    hidden: boolean = false
  ) => ({
    layerId,
    layerType,
    config: {
      hidden,
      groups: [],
    },
  });

  it('returns label for single data layer', () => {
    const layerConfigs = [createLayerConfig('layer1', 'data')];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Data layer');
  });

  it('returns numbered labels for multiple data layers', () => {
    const layerConfigs = [
      createLayerConfig('layer1', 'data'),
      createLayerConfig('layer2', 'data'),
      createLayerConfig('layer3', 'data'),
    ];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Data layer 1');
    expect(result.current('layer2')).toBe('Data layer 2');
    expect(result.current('layer3')).toBe('Data layer 3');
  });

  it('returns label for single reference line layer', () => {
    const layerConfigs = [createLayerConfig('layer1', 'referenceLine')];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Reference line');
  });

  it('returns numbered labels for multiple reference line layers', () => {
    const layerConfigs = [
      createLayerConfig('layer1', 'referenceLine'),
      createLayerConfig('layer2', 'referenceLine'),
    ];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Reference line 1');
    expect(result.current('layer2')).toBe('Reference line 2');
  });

  it('returns label for single annotation layer', () => {
    const layerConfigs = [createLayerConfig('layer1', 'annotations')];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Annotation');
  });

  it('returns numbered labels for multiple annotation layers', () => {
    const layerConfigs = [
      createLayerConfig('layer1', 'annotations'),
      createLayerConfig('layer2', 'annotations'),
    ];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Annotation 1');
    expect(result.current('layer2')).toBe('Annotation 2');
  });

  it('returns label for single metric trendline layer', () => {
    const layerConfigs = [createLayerConfig('layer1', 'metricTrendline')];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Metric trendline');
  });

  it('handles mixed layer types with separate numbering', () => {
    const layerConfigs = [
      createLayerConfig('layer1', 'data'),
      createLayerConfig('layer2', 'referenceLine'),
      createLayerConfig('layer3', 'data'),
      createLayerConfig('layer4', 'annotations'),
      createLayerConfig('layer5', 'referenceLine'),
    ];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Data layer 1');
    expect(result.current('layer2')).toBe('Reference line 1');
    expect(result.current('layer3')).toBe('Data layer 2');
    expect(result.current('layer4')).toBe('Annotation');
    expect(result.current('layer5')).toBe('Reference line 2');
  });

  it('excludes hidden layers from counting', () => {
    const layerConfigs = [
      createLayerConfig('layer1', 'data'),
      createLayerConfig('layer2', 'data', true),
      createLayerConfig('layer3', 'data'),
    ];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Data layer 1');
    expect(result.current('layer2')).toBe('Unknown layer');
    expect(result.current('layer3')).toBe('Data layer 2');
  });

  it('handles layers with undefined layer type', () => {
    const layerConfigs = [createLayerConfig('layer1', undefined)];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Unknown layer');
  });

  it('numbers layers with undefined type when multiple exist', () => {
    const layerConfigs = [
      createLayerConfig('layer1', undefined),
      createLayerConfig('layer2', undefined),
      createLayerConfig('layer3', undefined),
    ];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Unknown layer 1');
    expect(result.current('layer2')).toBe('Unknown layer 2');
    expect(result.current('layer3')).toBe('Unknown layer 3');
  });

  it('returns "Unknown layer" for non-existent layer id', () => {
    const layerConfigs = [createLayerConfig('layer1', 'data')];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('nonexistent')).toBe('Unknown layer');
  });

  it('handles empty layer configs array', () => {
    const layerConfigs: ReturnType<typeof createLayerConfig>[] = [];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Unknown layer');
  });

  it('maintains stable reference for getLayerTabsLabel function', () => {
    const layerConfigs = [createLayerConfig('layer1', 'data')];
    const { result, rerender } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    const firstReference = result.current;
    rerender();

    expect(result.current).toBe(firstReference);
  });

  it('updates labels when layer configs change', () => {
    let layerConfigs = [createLayerConfig('layer1', 'data')];
    const { result, rerender } = renderHook(({ configs }) => useGetLayerTabsLabel(configs), {
      initialProps: { configs: layerConfigs },
    });

    expect(result.current('layer1')).toBe('Data layer');

    layerConfigs = [createLayerConfig('layer1', 'data'), createLayerConfig('layer2', 'data')];
    rerender({ configs: layerConfigs });

    expect(result.current('layer1')).toBe('Data layer 1');
    expect(result.current('layer2')).toBe('Data layer 2');
  });

  it('handles only hidden layers', () => {
    const layerConfigs = [
      createLayerConfig('layer1', 'data', true),
      createLayerConfig('layer2', 'data', true),
    ];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Unknown layer');
    expect(result.current('layer2')).toBe('Unknown layer');
  });

  it('handles mix of visible and hidden layers with same type', () => {
    const layerConfigs = [
      createLayerConfig('layer1', 'data'),
      createLayerConfig('layer2', 'data', true),
      createLayerConfig('layer3', 'data'),
      createLayerConfig('layer4', 'data', true),
      createLayerConfig('layer5', 'data'),
    ];
    const { result } = renderHook(() => useGetLayerTabsLabel(layerConfigs));

    expect(result.current('layer1')).toBe('Data layer 1');
    expect(result.current('layer2')).toBe('Unknown layer');
    expect(result.current('layer3')).toBe('Data layer 2');
    expect(result.current('layer4')).toBe('Unknown layer');
    expect(result.current('layer5')).toBe('Data layer 3');
  });
});
