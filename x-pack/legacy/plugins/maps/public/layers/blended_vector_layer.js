/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorLayer } from './vector_layer';
import { ES_GEO_GRID, LAYER_TYPE } from '../../common/constants';
import { ESGeoGridSource, RENDER_AS } from './sources/es_geo_grid_source';
import { canSkipSourceUpdate } from './util/can_skip_fetch';

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

  destroy() {
    if (this._documentSource) {
      this._documentSource.destroy();
    }
    if (this._clusterSource) {
      this._clusterSource.destroy();
    }
  }

  _initActiveSourceAndStyle() {
    this._documentSource = this._source; // VectorLayer constructor sets _source as document source
    this._activeSource = this._documentSource;

    const clusterSourceDescriptor = ESGeoGridSource.createDescriptor({
      indexPatternId: this._documentSource.getIndexPatternId(),
      geoField: this._documentSource.getGeoFieldName(),
      requestType: RENDER_AS.POINT,
    });
    this._clusterSource = new ESGeoGridSource(
      clusterSourceDescriptor,
      this._documentSource.getInspectorAdapters()
    );
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

  getSourceForEditing() {
    // Layer is based on this._documentSource
    // this._clusterSource is a derived source for rendering only.
    // Regardless of this._activeSource, this._documentSource should always be displayed in the editor
    return this._documentSource;
  }

  async syncData(syncContext) {
    console.log('BlendedVectorLayer.syncData');
    //console.log(syncContext);

    const searchFilters = this._getSearchFilters(syncContext.dataFilters);
    const prevDataRequest = this.getSourceDataRequest();
    const canSkipFetch = await canSkipSourceUpdate({
      source: this._source,
      prevDataRequest,
      nextMeta: searchFilters,
    });
    if (!canSkipFetch) {
      const searchSource = await this._documentSource._makeSearchSource(searchFilters, 0);
      const resp = await searchSource.fetch();
      if (resp.hits.total > 100) {
        this._activeSource = this._clusterSource;
      } else {
        this._activeSource = this._documentSource;
      }
    }

    super.syncData(syncContext);
  }

  /*syncLayerWithMB(mbMap) {}*/
}
