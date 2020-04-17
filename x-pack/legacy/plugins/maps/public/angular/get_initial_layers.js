/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
// Import each layer type, even those not used, to init in registry
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import '../../../../../plugins/maps/public/layers/sources/wms_source';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import '../../../../../plugins/maps/public/layers/sources/ems_file_source';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import '../../../../../plugins/maps/public/layers/sources/es_search_source';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import '../../../../../plugins/maps/public/layers/sources/es_pew_pew_source/es_pew_pew_source';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import '../../../../../plugins/maps/public/layers/sources/kibana_regionmap_source';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import '../../../../../plugins/maps/public/layers/sources/es_geo_grid_source';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import '../../../../../plugins/maps/public/layers/sources/xyz_tms_source';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaTilemapSource } from '../../../../../plugins/maps/public/layers/sources/kibana_tilemap_source';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { EMSTMSSource } from '../../../../../plugins/maps/public/layers/sources/ems_tms_source';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getInjectedVarFunc } from '../../../../../plugins/maps/public/kibana_services';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getKibanaTileMap } from '../../../../../plugins/maps/public/meta';

export function getInitialLayers(layerListJSON, initialLayers = []) {
  if (layerListJSON) {
    return JSON.parse(layerListJSON);
  }

  const tilemapSourceFromKibana = getKibanaTileMap();
  if (_.get(tilemapSourceFromKibana, 'url')) {
    const sourceDescriptor = KibanaTilemapSource.createDescriptor();
    const source = new KibanaTilemapSource(sourceDescriptor);
    const layer = source.createDefaultLayer();
    return [layer.toLayerDescriptor(), ...initialLayers];
  }

  const isEmsEnabled = getInjectedVarFunc()('isEmsEnabled', true);
  if (isEmsEnabled) {
    const descriptor = EMSTMSSource.createDescriptor({ isAutoSelect: true });
    const source = new EMSTMSSource(descriptor);
    const layer = source.createDefaultLayer();
    return [layer.toLayerDescriptor(), ...initialLayers];
  }

  return initialLayers;
}
