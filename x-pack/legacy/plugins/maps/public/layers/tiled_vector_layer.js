/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { VectorStyle } from './styles/vector/vector_style';
import { SOURCE_DATA_ID_ORIGIN, LAYER_TYPE } from '../../common/constants';
import { VectorLayer } from './vector_layer';
import { EuiIcon } from '@elastic/eui';

export class TiledVectorLayer extends VectorLayer {
  static type = LAYER_TYPE.TILED_VECTOR;

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

  getCustomIconAndTooltipContent() {
    console.log('since no feature collection, not sure what to do..');
    return {
      icon: <EuiIcon size="m" type={this.getLayerTypeIconName()} />,
    };
  }

  async _syncMVTUrlTemplate({ startLoading, stopLoading, onLoadError, dataFilters }) {
    const sourceDataRequest = this.getSourceDataRequest();
    if (sourceDataRequest) {
      //data is immmutable
      console.log('already synced, no need to do again');
      return;
    }
    console.log('need to syncdata');
    const requestToken = Symbol(`layer-source-refresh:${this.getId()} - source`);
    startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, dataFilters);
    try {
      console.log('source!', this._source);
      const url = await this._source.getUrlTemplate(dataFilters);
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, url, {});
    } catch (error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
    }
  }

  async syncData(syncContext) {
    console.log('tvl syncData');
    if (!this.isVisible() || !this.showAtZoomLevel(syncContext.dataFilters.zoom)) {
      return;
    }

    await this._syncSourceStyleMeta(syncContext);
    await this._syncSourceFormatters(syncContext);
    await this._syncMVTUrlTemplate(syncContext);
  }

  _syncSourceBindingWithMb(mbMap) {
    console.log('tbl sync source bingins');
    const mbSource = mbMap.getSource(this.getId());
    if (!mbSource) {
      const sourceDataRequest = this.getSourceDataRequest();
      if (!sourceDataRequest) {
        //this is possible if the layer was invisible at startup.
        //the actions will not perform any data=syncing as an optimization when a layer is invisible
        //when turning the layer back into visible, it's possible the url has not been resovled yet.
        console.log('no sdr');
        return;
      }

      const url = sourceDataRequest.getData();
      if (!url) {
        console.log('no url!');
        return;
      }

      const sourceId = this.getId();
      mbMap.addSource(sourceId, {
        type: 'vector',
        tiles: [url],
      });
    }
  }

  _syncStylePropertiesWithMb(mbMap) {
    const options = { mvtSourceLayer: this._source.getMvtSourceLayer() };
    this._setMbPointsProperties(mbMap, options);
    this._setMbLinePolygonProperties(mbMap, options);
  }

  syncLayerWithMB(mbMap) {
    this._syncSourceBindingWithMb(mbMap);
    this._syncStylePropertiesWithMb(mbMap);
  }

  getJoins() {
    console.log('wtf is this getting called?');
    return [];
  }
}
