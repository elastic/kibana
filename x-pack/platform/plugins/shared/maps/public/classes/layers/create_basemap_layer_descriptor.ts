/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { LayerDescriptor } from '../../../common/descriptor_types';
import { createEmsVectorTileBasemapLayerDescriptor } from '../../../common/legacy_maps_conversion';
import { getKibanaTileMap } from '../../util';
import { getEMSSettings } from '../../kibana_services';
import { KibanaTilemapSource } from '../sources/kibana_tilemap_source';
import { RasterTileLayer } from './raster_tile_layer/raster_tile_layer';

export function createBasemapLayerDescriptor(): LayerDescriptor | null {
  const tilemapSourceFromKibana = getKibanaTileMap();
  if (_.get(tilemapSourceFromKibana, 'url')) {
    const layerDescriptor = RasterTileLayer.createDescriptor({
      sourceDescriptor: KibanaTilemapSource.createDescriptor(),
    });
    return layerDescriptor;
  }

  const isEmsEnabled = getEMSSettings()!.isEMSEnabled();
  if (isEmsEnabled) {
    return createEmsVectorTileBasemapLayerDescriptor({ id: uuidv4() });
  }

  return null;
}
