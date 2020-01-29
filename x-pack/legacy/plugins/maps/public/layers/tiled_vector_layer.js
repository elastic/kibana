/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AbstractLayer } from './layer';
import { VectorStyle } from './styles/vector/vector_style';
import { SOURCE_DATA_ID_ORIGIN, LAYER_TYPE } from '../../common/constants';
import _ from 'lodash';
import { JoinTooltipProperty } from './tooltips/join_tooltip_property';
import { DataRequestAbortError } from './util/data_request';
import { canSkipSourceUpdate } from './util/can_skip_fetch';
import { assignFeatureIds } from './util/assign_feature_ids';
import {
  getFillFilterExpression,
  getLineFilterExpression,
  getPointFilterExpression,
} from './util/mb_filter_expressions';
import { VectorLayer } from './vector_layer';

export class TiledVectorLayer extends AbstractLayer {
  static type = LAYER_TYPE.TILED_VECTOR;

  // static createDescriptor(options, mapColors) {
  //   const layerDescriptor = super.createDescriptor(options);
  //   layerDescriptor.type = TiledVectorLayer.type;
  //   return layerDescriptor;
  // }

  static createDescriptor(options, mapColors) {
    const layerDescriptor = super.createDescriptor(options);
    layerDescriptor.type = TiledVectorLayer.type;

    if (!options.style) {
      const styleProperties = VectorStyle.createDefaultStyleProperties(mapColors);
      layerDescriptor.style = VectorStyle.createDescriptor(styleProperties);
    }

    return layerDescriptor;
  }

  constructor(options) {
    super(options);
    this._style = new VectorStyle(this._descriptor.style, this._source, this);
    console.log('created oner with style!', this._style);
  }

  destroy() {
    if (this._source) {
      this._source.destroy();
    }
  }

  getLayerTypeIconName() {
    return 'vector';
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
    console.log('need to syncdata');
    const requestToken = Symbol(`layer-source-refresh:${this.getId()} - source`);
    startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, dataFilters);
    try {
      console.log('source!', this._source);
      const url = await this._source.getUrlTemplate();
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, url, {});
    } catch (error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
    }
  }

  // _setMbPointsProperties(mbMap) {
  //   const pointLayerId = this._getMbPointLayerId();
  //   const symbolLayerId = this._getMbSymbolLayerId();
  //   const pointLayer = mbMap.getLayer(pointLayerId);
  //   const symbolLayer = mbMap.getLayer(symbolLayerId);
  //
  //   let mbLayerId;
  //   if (this._style.arePointsSymbolizedAsCircles()) {
  //     mbLayerId = pointLayerId;
  //     if (symbolLayer) {
  //       mbMap.setLayoutProperty(symbolLayerId, 'visibility', 'none');
  //     }
  //     this._setMbCircleProperties(mbMap);
  //   } else {
  //     mbLayerId = symbolLayerId;
  //     if (pointLayer) {
  //       mbMap.setLayoutProperty(pointLayerId, 'visibility', 'none');
  //     }
  //     this._setMbSymbolProperties(mbMap);
  //   }
  //
  //   this.syncVisibilityWithMb(mbMap, mbLayerId);
  //   mbMap.setLayerZoomRange(mbLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
  // }

  // _setMbCircleProperties(mbMap) {
  //   const sourceId = this.getId();
  //   const pointLayerId = this._getMbPointLayerId();
  //   const pointLayer = mbMap.getLayer(pointLayerId);
  //
  //   if (!pointLayer) {
  //     mbMap.addLayer({
  //       id: pointLayerId,
  //       type: 'circle',
  //       source: sourceId,
  //       paint: {}
  //     });
  //   }
  //
  //   const filterExpr = getPointFilterExpression(this._hasJoins());
  //   if (filterExpr !== mbMap.getFilter(pointLayerId)) {
  //     mbMap.setFilter(pointLayerId, filterExpr);
  //   }
  //
  //   this._style.setMBPaintPropertiesForPoints({
  //     alpha: this.getAlpha(),
  //     mbMap,
  //     pointLayerId: pointLayerId,
  //   });
  // }
  //
  // _setMbSymbolProperties(mbMap) {
  //   const sourceId = this.getId();
  //   const symbolLayerId = this._getMbSymbolLayerId();
  //   const symbolLayer = mbMap.getLayer(symbolLayerId);
  //
  //   if (!symbolLayer) {
  //     mbMap.addLayer({
  //       id: symbolLayerId,
  //       type: 'symbol',
  //       source: sourceId,
  //     });
  //   }
  //
  //   const filterExpr = getPointFilterExpression(this._hasJoins());
  //   if (filterExpr !== mbMap.getFilter(symbolLayerId)) {
  //     mbMap.setFilter(symbolLayerId, filterExpr);
  //   }
  //
  //   this._style.setMBSymbolPropertiesForPoints({
  //     alpha: this.getAlpha(),
  //     mbMap,
  //     symbolLayerId: symbolLayerId,
  //   });
  // }
  //
  // _setMbLinePolygonProperties(mbMap) {
  //   const sourceId = this.getId();
  //   const fillLayerId = this._getMbPolygonLayerId();
  //   const lineLayerId = this._getMbLineLayerId();
  //   const hasJoins = this._hasJoins();
  //   if (!mbMap.getLayer(fillLayerId)) {
  //     mbMap.addLayer({
  //       id: fillLayerId,
  //       type: 'fill',
  //       source: sourceId,
  //       paint: {}
  //     });
  //   }
  //   if (!mbMap.getLayer(lineLayerId)) {
  //     mbMap.addLayer({
  //       id: lineLayerId,
  //       type: 'line',
  //       source: sourceId,
  //       paint: {}
  //     });
  //   }
  //   this._style.setMBPaintProperties({
  //     alpha: this.getAlpha(),
  //     mbMap,
  //     fillLayerId,
  //     lineLayerId,
  //   });
  //
  //   this.syncVisibilityWithMb(mbMap, fillLayerId);
  //   mbMap.setLayerZoomRange(fillLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
  //   const fillFilterExpr = getFillFilterExpression(hasJoins);
  //   if (fillFilterExpr !== mbMap.getFilter(fillLayerId)) {
  //     mbMap.setFilter(fillLayerId, fillFilterExpr);
  //   }
  //
  //   this.syncVisibilityWithMb(mbMap, lineLayerId);
  //   mbMap.setLayerZoomRange(lineLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
  //   const lineFilterExpr = getLineFilterExpression(hasJoins);
  //   if (lineFilterExpr !== mbMap.getFilter(lineLayerId)) {
  //     mbMap.setFilter(lineLayerId, lineFilterExpr);
  //   }
  // }

  _syncStylePropertiesWithMb(mbMap) {
    console.log('need to sync style', mbMap);
    // this._setMbPointsProperties(mbMap);
    // this._setMbLinePolygonProperties(mbMap);
  }

  _syncSourceBindingWithMb(mbMap) {
    const mbSource = mbMap.getSource(this.getId());
    if (!mbSource) {
      console.log('need to sync source');
      // mbMap.addSource(this.getId(), {
      //   type: 'geojson',
      //   data: EMPTY_FEATURE_COLLECTION
      // });
    }
  }

  syncLayerWithMB(mbMap) {
    const source = mbMap.getSource(this.getId());
    const mbLayerId = this._getMbLineLayerId();

    if (!source) {
      const sourceDataRequest = this.getSourceDataRequest();
      console.log('sdr', sourceDataRequest);
      if (!sourceDataRequest) {
        //this is possible if the layer was invisible at startup.
        //the actions will not perform any data=syncing as an optimization when a layer is invisible
        //when turning the layer back into visible, it's possible the url has not been resovled yet.
        return;
      }
      const url = sourceDataRequest.getData();
      console.log('url', url);
      if (!url) {
        console.log('no url!');
        return;
      }

      const sourceId = this.getId();
      mbMap.addSource(sourceId, {
        type: 'vector',
        tiles: [url],
      });

      console.log('source added');

      console.log('going to add layer', mbLayerId, sourceId)
      mbMap.addLayer({
        id: mbLayerId,
        type: 'line',
        source: sourceId,
        'source-layer': 'geojsonLayer',
        "layout": {
          "line-cap": "round",
          "line-join": "round"
        },
        "paint": {
          "line-opacity": 0.6,
          "line-color": "rgb(53, 175, 109)",
          "line-width": 2
        }
      });

      console.log('layer added');
    }

    this._setTiledVectorLayerProperties(mbMap, mbLayerId);
  }

  _setTiledVectorLayerProperties(mbMap, mbLayerId) {
    this.syncVisibilityWithMb(mbMap, mbLayerId);
    mbMap.setLayerZoomRange(mbLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    mbMap.setPaintProperty(mbLayerId, 'line-opacity', this.getAlpha());
  }

  ownsMbLayerId(mbLayerId) {
    return this.getMbLayerIds().includes(mbLayerId);
  }

  // _getMbSymbolLayerId() {
  //   return this.makeMbLayerId('symbol');
  // }

  _getMbLineLayerId() {
    return this.makeMbLayerId('line');
  }

  // _getMbPolygonLayerId() {
  //   return this.makeMbLayerId('fill');
  // }

  getMbLayerIds() {
    // return [this._getMbPointLayerId(), this._getMbSymbolLayerId(), this._getMbLineLayerId(), this._getMbPolygonLayerId()];
    return [this._getMbLineLayerId()];
  }

  ownsMbSourceId(mbSourceId) {
    return this.getId() === mbSourceId;
  }

  getJoins() {
    console.log('wtf is this getting called?');
    return [];
  }
}
