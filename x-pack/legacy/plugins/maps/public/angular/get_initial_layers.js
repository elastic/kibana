/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { KibanaTilemapSource } from '../layers/sources/kibana_tilemap_source';
import { EMSTMSSource } from '../layers/sources/ems_tms_source';
import chrome from 'ui/chrome';
import { getKibanaTileMap } from '../meta';

export function getInitialLayers(layerListJSON) {
  if (layerListJSON) {
    return JSON.parse(layerListJSON);
  }

  const tilemapSourceFromKibana = getKibanaTileMap();
  if (_.get(tilemapSourceFromKibana, 'url')) {
    const sourceDescriptor = KibanaTilemapSource.createDescriptor();
    const source = new KibanaTilemapSource(sourceDescriptor);
    const layer = source.createDefaultLayer();
    return [layer.toLayerDescriptor()];
  }

  const isEmsEnabled = chrome.getInjected('isEmsEnabled', true);
  if (isEmsEnabled) {
    const descriptor = EMSTMSSource.createDescriptor({ isAutoSelect: true });
    const source = new EMSTMSSource(descriptor);
    const layer = source.createDefaultLayer();
    return [layer.toLayerDescriptor()];
  }

  return [];
}
