/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TileLayer } from './tile_layer';
import _ from 'lodash';
import { SOURCE_DATA_ID_ORIGIN } from '../../common/constants';

const MB_STYLE_TYPE_TO_OPACITY = {
  'fill': ['fill-opacity'],
  'line': ['line-opacity'],
  'circle': ['circle-opacity'],
  'background': ['background-opacity'],
  'symbol': ['icon-opacity', 'text-opacity']
};

export class VectorTileLayer extends TileLayer {

  static type = 'VECTOR_TILE';

  constructor({ layerDescriptor, source, style }) {
    super({ layerDescriptor, source, style });
  }

  static createDescriptor(options) {
    const tileLayerDescriptor = super.createDescriptor(options);
    tileLayerDescriptor.type = VectorTileLayer.type;
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
      const vectorStyle = await this._source.getVectorStyleSheet();
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, vectorStyle, {});
    } catch(error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
    }
  }

  _generateMbId(name) {
    return this.getId() + '_' + name;
  }

  _getVectorStyle() {
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return null;
    }
    return sourceDataRequest.getData();
  }

  getMbLayerIds() {
    const vectorStyle = this._getVectorStyle();
    if (!vectorStyle) {
      return [];
    }
    const mbLayerIds = vectorStyle.layers.map(layer => {
      return this._generateMbId(layer.id);
    });
    console.log(mbLayerIds);
    return mbLayerIds;
  }

  getMbSourceIds() {
    const vectorStyle = this._getVectorStyle();
    if (!vectorStyle) {
      return [];
    }
    const sourceIds = Object.keys(vectorStyle.sources);
    const  mbSourceIds = sourceIds.map(sourceId => this._generateMbId(sourceId));
    console.log(mbSourceIds);
    return mbSourceIds;
  }

  ownsMbLayerId(mbLayerId) {
    const mbLayerIds = this.getMbLayerIds();
    return mbLayerIds.indexOf(mbLayerId) >= 0;
  }

  ownsMbSourceId(mbSourceId) {
    const mbSourceIds = this.getMbLayerIds();
    return mbSourceIds.indexOf(mbSourceId) >= 0;
  }

  syncLayerWithMB(mbMap) {

    const vectorStyle = this._getVectorStyle();
    if (!vectorStyle) {
      return;
    }

    const sourceIds = Object.keys(vectorStyle.sources);
    sourceIds.forEach(sourceId => {
      const mbSourceId = this._generateMbId(sourceId);
      const mbSource = mbMap.getSource(mbSourceId);
      console.log('gs', mbSourceId, mbSource);
      if (mbSource) {
        console.log('skip adding', mbSourceId);
        return;
      }

      console.log('add source', mbSourceId);
      mbMap.addSource(mbSourceId, {
        type: 'vector',
        url: vectorStyle.sources[sourceId].url
      });
    });

    vectorStyle.layers.forEach(layer => {
      const mbLayerId = this._generateMbId(layer.id);
      const mbLayer = mbMap.getLayer(mbLayerId);
      console.log('gl', mbLayerId, mbLayer);
      if (mbLayer) {
        console.log('skip adding', mbLayerId);
        return;
      }
      const newLayerObject = {
        ...layer,
        source: this._generateMbId(layer.source),
        id: mbLayerId
      };

      console.log('add layer', newLayerObject);
      mbMap.addLayer(newLayerObject);
    });
  }


}
