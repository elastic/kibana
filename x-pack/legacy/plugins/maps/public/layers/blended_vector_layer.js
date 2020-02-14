/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorLayer } from './vector_layer';
import { ES_GEO_GRID, LAYER_TYPE } from '../../common/constants';

export class BlendedVectorLayer extends VectorLayer {
  static type = LAYER_TYPE.BLENDED_VECTOR;

  static createDescriptor(options, mapColors) {
    const layerDescriptor = VectorLayer.createDescriptor(options, mapColors);
    layerDescriptor.type = BlendedVectorLayer.type;
    return layerDescriptor;
  }

  constructor(options) {
    super(options);

    this._initActiveSourceAndStyle();
  }

  _initActiveSourceAndStyle() {
    // VectorLayer constructor sets _source as document source
    this._documentSource = this._source;
    this._clusterSource = this._source;
    this._activeSource = this._documentSource;

    const sourceDataRequest = this.getSourceDataRequest();
    if (sourceDataRequest) {
      const requestMeta = sourceDataRequest.getMeta();
      if (requestMeta && requestMeta.sourceType === ES_GEO_GRID) {
        this._activeSource = this._clusterSource;
      }
    }
  }

  isJoinable() {
    return false;
  }

  getJoins() {
    return [];
  }

  getSource() {
    return this._activeSource;
  }

  async syncData(syncContext) {
    console.log('BlendedVectorLayer.syncData');
    //console.log(syncContext);

    /*const searchFilters = this._getSearchFilters(dataFilters);
    const prevDataRequest = this.getSourceDataRequest();
    const canSkipFetch = await canSkipSourceUpdate({
      source: this._source,
      prevDataRequest,
      nextMeta: searchFilters,
    });
    if (!canSkipFetch) {
      return {
        refreshed: false,
        featureCollection: prevDataRequest.getData(),
      };
    }*/
    super.syncData(syncContext);
  }

  /*syncLayerWithMB(mbMap) {}*/
}
