/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

// Color stops from default Mapbox heatmap-color
export const DEFAULT_RGB_HEATMAP_COLOR_RAMP = [
  'rgb(65, 105, 225)', // royalblue
  'rgb(0, 256, 256)', // cyan
  'rgb(0, 256, 0)', // lime
  'rgb(256, 256, 0)', // yellow
  'rgb(256, 0, 0)', // red
];

export const DEFAULT_HEATMAP_COLOR_RAMP_NAME = 'theclassic';

export const HEATMAP_COLOR_RAMP_LABEL = i18n.translate('xpack.maps.heatmap.colorRampLabel', {
  defaultMessage: 'Color range'
});
