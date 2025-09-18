/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const layerTypes = {
  DATA: 'data',
  REFERENCELINE: 'referenceLine',
  ANNOTATIONS: 'annotations',
  METRIC_TRENDLINE: 'metricTrendline',
} as const;
export type LayerType = (typeof layerTypes)[keyof typeof layerTypes];

// Mapping of layer types to display names
export const layerTypeDisplayNames = {
  data: i18n.translate('xpack.lens.layerTypes.displayName.data', {
    defaultMessage: 'Data',
  }),
  referenceLine: i18n.translate('xpack.lens.layerTypes.displayName.referenceLine', {
    defaultMessage: 'Reference line',
  }),
  annotations: i18n.translate('xpack.lens.layerTypes.displayName.annotations', {
    defaultMessage: 'Annotation',
  }),
  metricTrendline: i18n.translate('xpack.lens.layerTypes.displayName.metricTrendline', {
    defaultMessage: 'Metric trendline',
  }),
} as const;

// Utility function to get the display name for a layer type
export function getLayerTypeDisplayName(layerType?: LayerType): string {
  if (!layerType)
    return i18n.translate('xpack.lens.layerTypes.displayName.layer', {
      defaultMessage: 'Layer',
    });

  return layerTypeDisplayNames[layerType] || layerType;
}
