/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TileLayer } from './tile_layer';
import _ from 'lodash';
import { SOURCE_DATA_ID_ORIGIN, LAYER_TYPE } from '../../common/constants';
import { isRetina } from '../meta';
import {
  addSpriteSheetToMapFromImageData,
  loadSpriteSheetImageData,
} from '../connected_components/map/mb/utils'; //todo move this implementation

const MB_STYLE_TYPE_TO_OPACITY = {
  fill: ['fill-opacity'],
  line: ['line-opacity'],
  circle: ['circle-opacity'],
  background: ['background-opacity'],
  symbol: ['icon-opacity', 'text-opacity'],
};

export class VectorTileLayer extends TileLayer {
  static type = LAYER_TYPE.VECTOR_TILE;

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
    if (sourceDataRequest) {
      //data is immmutable
      return;
    }
    const requestToken = Symbol(`layer-source-refresh:${this.getId()} - source`);
    startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, dataFilters);
    try {
      const styleAndSprites = await this._source.getVectorStyleSheetAndSpriteMeta(isRetina());
      const spriteSheetImageData = await loadSpriteSheetImageData(styleAndSprites.spriteMeta.png);
      const data = {
        ...styleAndSprites,
        spriteSheetImageData,
      };
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, data, {});
    } catch (error) {
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
    const vectorStyleAndSprites = sourceDataRequest.getData();
    if (!vectorStyleAndSprites) {
      return null;
    }
    return vectorStyleAndSprites.vectorStyleSheet;
  }

  _getSpriteMeta() {
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return null;
    }
    const vectorStyleAndSprites = sourceDataRequest.getData();
    return vectorStyleAndSprites.spriteMeta;
  }

  _getSpriteImageData() {
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return null;
    }
    const vectorStyleAndSprites = sourceDataRequest.getData();
    return vectorStyleAndSprites.spriteSheetImageData;
  }

  getMbLayerIds() {
    const vectorStyle = this._getVectorStyle();
    if (!vectorStyle) {
      return [];
    }
    return vectorStyle.layers.map(layer => this._generateMbId(layer.id));
  }

  getMbSourceIds() {
    const vectorStyle = this._getVectorStyle();
    if (!vectorStyle) {
      return [];
    }
    const sourceIds = Object.keys(vectorStyle.sources);
    return sourceIds.map(sourceId => this._generateMbId(sourceId));
  }

  ownsMbLayerId(mbLayerId) {
    //todo optimize: do not create temp array
    const mbLayerIds = this.getMbLayerIds();
    return mbLayerIds.indexOf(mbLayerId) >= 0;
  }

  ownsMbSourceId(mbSourceId) {
    //todo optimize: do not create temp array
    const mbSourceIds = this.getMbSourceIds();
    return mbSourceIds.indexOf(mbSourceId) >= 0;
  }

  _makeNamespacedImageId(imageId) {
    const prefix = this._source.getSpriteNamespacePrefix() + '/';
    return prefix + imageId;
  }

  syncLayerWithMB(mbMap) {
    const vectorStyle = this._getVectorStyle();
    if (!vectorStyle) {
      return;
    }

    let initialBootstrapCompleted = false;
    const sourceIds = Object.keys(vectorStyle.sources);
    sourceIds.forEach(sourceId => {
      if (initialBootstrapCompleted) {
        return;
      }
      const mbSourceId = this._generateMbId(sourceId);
      const mbSource = mbMap.getSource(mbSourceId);
      if (mbSource) {
        //if a single source is present, the layer already has bootstrapped with the mbMap
        initialBootstrapCompleted = true;
        return;
      }
      mbMap.addSource(mbSourceId, vectorStyle.sources[sourceId]);
    });

    if (!initialBootstrapCompleted) {
      //sync spritesheet
      const spriteMeta = this._getSpriteMeta();
      if (!spriteMeta) {
        return;
      }
      const newJson = {};
      for (const imageId in spriteMeta.json) {
        if (spriteMeta.json.hasOwnProperty(imageId)) {
          const namespacedImageId = this._makeNamespacedImageId(imageId);
          newJson[namespacedImageId] = spriteMeta.json[imageId];
        }
      }

      const imageData = this._getSpriteImageData();
      if (!imageData) {
        return;
      }
      addSpriteSheetToMapFromImageData(newJson, imageData, mbMap);

      //sync layers
      vectorStyle.layers.forEach(layer => {
        const mbLayerId = this._generateMbId(layer.id);
        const mbLayer = mbMap.getLayer(mbLayerId);
        if (mbLayer) {
          return;
        }
        const newLayerObject = {
          ...layer,
          source: this._generateMbId(layer.source),
          id: mbLayerId,
        };

        if (
          newLayerObject.type === 'symbol' &&
          newLayerObject.layout &&
          typeof newLayerObject.layout['icon-image'] === 'string'
        ) {
          newLayerObject.layout['icon-image'] = this._makeNamespacedImageId(
            newLayerObject.layout['icon-image']
          );
        }

        if (
          newLayerObject.type === 'fill' &&
          newLayerObject.paint &&
          typeof newLayerObject.paint['fill-pattern'] === 'string'
        ) {
          newLayerObject.paint['fill-pattern'] = this._makeNamespacedImageId(
            newLayerObject.paint['fill-pattern']
          );
        }

        mbMap.addLayer(newLayerObject);
      });
    }

    this._setTileLayerProperties(mbMap);
  }

  _setOpacityForType(mbMap, mbLayer, mbLayerId) {
    const opacityProps = MB_STYLE_TYPE_TO_OPACITY[mbLayer.type];
    if (!opacityProps) {
      return;
    }

    opacityProps.forEach(opacityProp => {
      if (mbLayer.paint && typeof mbLayer.paint[opacityProp] === 'number') {
        const newOpacity = mbLayer.paint[opacityProp] * this.getAlpha();
        mbMap.setPaintProperty(mbLayerId, opacityProp, newOpacity);
      } else {
        mbMap.setPaintProperty(mbLayerId, opacityProp, this.getAlpha());
      }
    });
  }

  _setLayerZoomRange(mbMap, mbLayer, mbLayerId) {
    let minZoom = this._descriptor.minZoom;
    if (typeof mbLayer.minzoom === 'number') {
      minZoom = Math.max(minZoom, mbLayer.minzoom);
    }
    let maxZoom = this._descriptor.maxZoom;
    if (typeof mbLayer.maxzoom === 'number') {
      maxZoom = Math.min(maxZoom, mbLayer.maxzoom);
    }
    mbMap.setLayerZoomRange(mbLayerId, minZoom, maxZoom);
  }

  _setTileLayerProperties(mbMap) {
    const vectorStyle = this._getVectorStyle();
    if (!vectorStyle) {
      return;
    }

    vectorStyle.layers.forEach(mbLayer => {
      const mbLayerId = this._generateMbId(mbLayer.id);
      this.syncVisibilityWithMb(mbMap, mbLayerId);
      this._setLayerZoomRange(mbMap, mbLayer, mbLayerId);
      this._setOpacityForType(mbMap, mbLayer, mbLayerId);
    });
  }
}
