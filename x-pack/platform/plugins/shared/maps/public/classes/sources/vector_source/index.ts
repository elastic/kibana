/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './vector_source';
import { i18n } from '@kbn/i18n';
export type { IMvtVectorSource } from './mvt_vector_source';

export const getLayerFeaturesRequestName = (layerName: string) => {
  return i18n.translate('xpack.maps.vectorSource.featuresRequestName', {
    defaultMessage: 'load layer features ({layerName})',
    values: { layerName },
  });
};
