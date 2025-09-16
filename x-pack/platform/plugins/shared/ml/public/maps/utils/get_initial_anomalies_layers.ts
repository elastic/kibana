/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlIdGenerator, type EuiThemeComputed } from '@elastic/eui';
import { LAYER_TYPE } from '@kbn/maps-plugin/common';
import { AnomalySource } from '../anomaly_source';
import { ML_ANOMALY_LAYERS, TYPICAL_STYLE } from './constants';
import { getActualStyle } from './get_actual_style';

export function getInitialAnomaliesLayers(jobId: string, euiTheme: EuiThemeComputed) {
  const initialLayers = [];
  for (const layer in ML_ANOMALY_LAYERS) {
    if (Object.hasOwn(ML_ANOMALY_LAYERS, layer)) {
      initialLayers.push({
        id: htmlIdGenerator()(),
        type: LAYER_TYPE.GEOJSON_VECTOR,
        sourceDescriptor: AnomalySource.createDescriptor({
          jobId,
          typicalActual: ML_ANOMALY_LAYERS[layer as keyof typeof ML_ANOMALY_LAYERS],
        }),
        style:
          ML_ANOMALY_LAYERS[layer as keyof typeof ML_ANOMALY_LAYERS] === ML_ANOMALY_LAYERS.TYPICAL
            ? TYPICAL_STYLE
            : getActualStyle(euiTheme),
      });
    }
  }
  return initialLayers;
}
