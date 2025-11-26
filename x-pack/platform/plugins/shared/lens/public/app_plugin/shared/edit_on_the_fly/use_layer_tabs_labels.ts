/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import type { LensLayerType, VisualizationDimensionGroupConfig } from '@kbn/lens-common';
import { getLensLayerTypeTabDisplayName, lensLayerTypeTabDisplayNames } from '@kbn/lens-common';

interface LayerConfig {
  layerId: string;
  layerType: LensLayerType | undefined;
  config: {
    hidden?: boolean | undefined;
    groups: VisualizationDimensionGroupConfig[];
  };
}

export const useGetLayerTabsLabel = (layerConfigs: LayerConfig[]) => {
  const layerLabels = useMemo(() => {
    const visibleLayerConfigs = layerConfigs.filter((layer) => !layer.config.hidden);
    const countsByLayerId = new Map<string, number>();
    const typeCounters = new Map<string, number>();
    const layerTabDisplayNames = new Map<string, string>();

    for (const config of visibleLayerConfigs) {
      const layerType = config.layerType || '';
      const currentCount = (typeCounters.get(layerType) || 0) + 1;
      typeCounters.set(layerType, currentCount);
      countsByLayerId.set(config.layerId, currentCount);
    }

    for (const config of visibleLayerConfigs) {
      const layerType = config.layerType || '';
      const typeCount = typeCounters.get(layerType) || 0;
      const layerCountForId = countsByLayerId.get(config.layerId) || 1;
      const displayName = getLensLayerTypeTabDisplayName(
        config.layerType,
        typeCount,
        layerCountForId
      );

      layerTabDisplayNames.set(config.layerId, displayName);
    }

    return layerTabDisplayNames;
  }, [layerConfigs]);

  const getLayerTabsLabel = useCallback(
    (layerId: string) => {
      return layerLabels.get(layerId) || lensLayerTypeTabDisplayNames.unknown;
    },
    [layerLabels]
  );

  return getLayerTabsLabel;
};
