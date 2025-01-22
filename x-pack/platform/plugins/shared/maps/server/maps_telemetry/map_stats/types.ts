/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LAYER_KEYS,
  SCALING_KEYS,
  JOIN_KEYS,
  EMS_BASEMAP_KEYS,
  RESOLUTION_KEYS,
} from '../../../common/telemetry/types';

export interface ClusterCountStats {
  min: number;
  max: number;
  total: number;
  avg: number;
}

export interface MapStats {
  mapsTotalCount: number;
  timeCaptured: string;
  layerTypes: { [key in LAYER_KEYS]?: ClusterCountStats };
  scalingOptions: { [key in SCALING_KEYS]?: ClusterCountStats };
  joins: { [key in JOIN_KEYS]?: ClusterCountStats };
  basemaps: { [key in EMS_BASEMAP_KEYS]?: ClusterCountStats };
  resolutions: { [key in RESOLUTION_KEYS]?: ClusterCountStats };
  attributesPerMap: {
    dataSourcesCount: Omit<ClusterCountStats, 'total'>;
    layersCount: Omit<ClusterCountStats, 'total'>;
    layerTypesCount: { [key: string]: Omit<ClusterCountStats, 'total'> };
    emsVectorLayersCount: { [key: string]: Omit<ClusterCountStats, 'total'> };
    customIconsCount: Omit<ClusterCountStats, 'total'>;
  };
}
