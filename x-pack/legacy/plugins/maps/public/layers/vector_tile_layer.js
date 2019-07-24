/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TileLayer } from './tile_layer';
import _ from 'lodash';
import { TileStyle } from '../layers/styles/tile_style';
import { MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER, SOURCE_DATA_ID_ORIGIN } from '../../common/constants';



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
    tileLayerDescriptor.style =
      TileStyle.createDescriptor(tileLayerDescriptor.style.properties);
    return tileLayerDescriptor;
  }

  _generateMbLayerId(mbLayer) {
    return this._getMbSourceId() + MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER + mbLayer.id;
  }

  getMbLayerIds() {
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {//data is immmutable
      return [];
    }

    const vectorStyle = sourceDataRequest.getData();
    const layerIds =  vectorStyle.layers.map(layer => {
      return this._generateMbLayerId(layer);
    });
    return layerIds;
  }

  _getMbSourceId() {
    return this.getId();
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
      const vectorStyle = await this._source.getVectorStyle();
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, vectorStyle, {});
    } catch(error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
    }
  }

  _getStyleFle() {
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      //this is possible if the layer was invisible at startup.
      //the actions will not perform any data=syncing as an optimization when a layer is invisible
      //when turning the layer back into visible, it's possible the url has not been resovled yet.
      return;
    }
    return sourceDataRequest.getData();
  }

  syncLayerWithMB(mbMap) {

    const sourceId = this._getMbSourceId();
    const source = mbMap.getSource(sourceId);

    if (!source) {


      const vectorStyle = this._getStyleFle();
      if (!vectorStyle) {
        return;
      }

      //assume single source
      const sourceIds = Object.keys(vectorStyle.sources);
      const firstSourceName = sourceIds[0];

      window._style = vectorStyle;

      mbMap.addSource(sourceId, {
        type: 'vector',
        url: vectorStyle.sources[firstSourceName].url
      });

      vectorStyle.layers.forEach(layer => {
        const newLayerObject = {
          ...layer,
          source: this._getMbSourceId(),
          id: this._generateMbLayerId(layer)
        };
        try {
          mbMap.addLayer(newLayerObject);
        } catch(e) {
          console.error(e);
        }
      });

    }

    this._setTileLayerProperties(mbMap);

  }


  _setOpacityForType(mbMap, mbLayer, mbLayerId) {


    const opacityProps = MB_STYLE_TYPE_TO_OPACITY[mbLayer.type];
    if (!opacityProps) {
      //don't know what to do
      return;
    }

    opacityProps.forEach(opacityProp => {
      if (mbLayer.paint && typeof mbLayer.paint[opacityProp] === 'number') {
        const newOpacity = (mbLayer.paint[opacityProp] / 1) * this.getAlpha();
        mbMap.setPaintProperty(mbLayerId, opacityProp, newOpacity);
      } else {
        mbMap.setPaintProperty(mbLayerId, opacityProp, this.getAlpha());
      }
    });

  }


  _setTileLayerProperties(mbMap) {

    const vectorStyle = this._getStyleFle();
    if (!vectorStyle) {
      return;
    }

    const style = mbMap.getStyle();
    if (!style || !style.layers) {
      return;
    }



    vectorStyle.layers.forEach(mbLayer => {

      const mbLayerId = this._generateMbLayerId(mbLayer);

      try {
        mbMap.setLayoutProperty(mbLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');


        let minZoom = this._descriptor.minZoom;
        if (typeof mbLayer.minzoom === 'number') {
          minZoom = Math.max(minZoom, mbLayer.minzoom);
        }

        let maxZoom = this._descriptor.maxZoom;
        if (typeof mbLayer.maxzoom === 'number') {
          maxZoom = Math.min(maxZoom, mbLayer.maxzoom);
        }

        mbMap.setLayerZoomRange(mbLayerId, minZoom, maxZoom);


        this._setOpacityForType(mbMap, mbLayer, mbLayerId);


      } catch(e) {
        console.error(e);
      }

    });


  }

}
