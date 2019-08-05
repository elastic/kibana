/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TileLayer } from './tile_layer';
import _ from 'lodash';
import { SOURCE_DATA_ID_ORIGIN } from '../../common/constants';

export class VectorTileLayer extends TileLayer {

  static type = 'VECTOR_TILE';

  constructor({ layerDescriptor, source, style }) {
    super({ layerDescriptor, source, style });
  }

  static createDescriptor(options) {
    const tileLayerDescriptor = super.createDescriptor(options);
    tileLayerDescriptor.type = TileLayer.type;
    tileLayerDescriptor.alpha = _.get(options, 'alpha', 1);
    return tileLayerDescriptor;
  }

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters }) {
    if (!this.isVisible() || !this.showAtZoomLevel(dataFilters.zoom)) {
      return;
    }
    const sourceDataRequest = this.getSourceDataRequest();
    if (sourceDataRequest) {//data is immmutable
      return;
    }
    const requestToken = Symbol(`layer-source-refresh:${ this.getId()} - source`);
    startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, dataFilters);
    try {
      const url = await this._source.getUrlTemplate();
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, url, {});
    } catch(error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
    }
  }


  getMbLayerIds() {
    return [];
  }

  ownsMbLayerId(mbLayerId) {
    return false;
  }

  ownsMbSourceId(mbSourceId) {
    return false;
  }

  syncLayerWithMB(mbMap) {





  }


}
