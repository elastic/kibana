/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { VectorStyle } from './styles/vector/vector_style';
import {
  SOURCE_DATA_ID_ORIGIN,
  LAYER_TYPE,
  FEATURE_ID_PROPERTY_NAME,
} from '../../common/constants';
import { VectorLayer } from './vector_layer';
import { EuiIcon } from '@elastic/eui';
import { canSkipSourceUpdate } from './util/can_skip_fetch';
import _ from 'lodash';

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
  }

  destroy() {
    if (this._source) {
      this._source.destroy();
    }
  }

  getCustomIconAndTooltipContent() {
    return {
      icon: <EuiIcon size="m" type={this.getLayerTypeIconName()} />,
    };
  }

  _getSearchFilters(dataFilters) {
    const fieldNames = [...this._source.getFieldNames(), ...this._style.getSourceFieldNames()];

    return {
      ...dataFilters,
      fieldNames: _.uniq(fieldNames).sort(),
      sourceQuery: this.getQuery(),
      applyGlobalQuery: this._source.getApplyGlobalQuery(),
    };
  }

  async _syncMVTUrlTemplate({
    startLoading,
    stopLoading,
    onLoadError,
    registerCancelCallback,
    dataFilters,
  }) {
    const requestToken = Symbol(`layer-${this.getId()}-${SOURCE_DATA_ID_ORIGIN}`);
    const searchFilters = this._getSearchFilters(dataFilters);
    const prevDataRequest = this.getSourceDataRequest();
    const canSkip = await canSkipSourceUpdate({
      source: this._source,
      prevDataRequest,
      nextMeta: searchFilters,
    });
    if (canSkip) {
      return null;
    }

    startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, searchFilters);
    try {
      const url = await this._source.getUrlTemplate(searchFilters);
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, url, {});
    } catch (error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
    }
  }

  async syncData(syncContext) {
    if (!this.isVisible() || !this.showAtZoomLevel(syncContext.dataFilters.zoom)) {
      return;
    }

    await this._syncSourceStyleMeta(syncContext);
    await this._syncSourceFormatters(syncContext);
    await this._syncMVTUrlTemplate(syncContext);
  }

  _syncSourceBindingWithMb(mbMap) {
    const mbSource = mbMap.getSource(this.getId());
    if (!mbSource) {
      const sourceDataRequest = this.getSourceDataRequest();
      if (!sourceDataRequest) {
        //this is possible if the layer was invisible at startup.
        //the actions will not perform any data=syncing as an optimization when a layer is invisible
        //when turning the layer back into visible, it's possible the url has not been resovled yet.
        return;
      }

      const url = sourceDataRequest.getData();
      if (!url) {
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
    const mbSource = mbMap.getSource(this.getId());
    if (!mbSource) {
      return;
    }

    const options = { mvtSourceLayer: this._source.getMvtSourceLayer() };
    this._setMbPointsProperties(mbMap, options);
    this._setMbLinePolygonProperties(mbMap, options);
  }

  _requiresPrevSourceCleanup(mbMap) {
    const tileSource = mbMap.getSource(this.getId());
    if (!tileSource) {
      return false;
    }
    const dataRequest = this.getSourceDataRequest();
    if (!dataRequest) {
      return false;
    }
    const newUrl = dataRequest.getData();
    if (tileSource.tiles[0] === newUrl) {
      //TileURL captures all the state. If this does not change, no updates are required.
      return false;
    }

    return true;
  }

  syncLayerWithMB(mbMap) {
    const requiresCleanup = this._requiresPrevSourceCleanup(mbMap);
    if (requiresCleanup) {
      const mbStyle = mbMap.getStyle();
      mbStyle.layers.forEach(mbLayer => {
        if (this.ownsMbLayerId(mbLayer.id)) {
          mbMap.removeLayer(mbLayer.id);
        }
      });
      Object.keys(mbStyle.sources).some(mbSourceId => {
        if (this.ownsMbSourceId(mbSourceId)) {
          mbMap.removeSource(mbSourceId);
        }
      });
    }

    this._syncSourceBindingWithMb(mbMap);
    this._syncStylePropertiesWithMb(mbMap);
  }

  getJoins() {
    return [];
  }

  getGeometryByFeatureId(featureId, meta) {
    return null;
  }

  async getFeaturePropertiesByFeatureId(featureId, meta) {
    const test = await this._source.filterAndFormatPropertiesToHtml({
      _id: meta.docId,
      _index: meta.indexName,
    });
    return test;
  }

  async loadPreIndexedShapeByFeatureId(featureId, meta) {
    return null;
  }
}
