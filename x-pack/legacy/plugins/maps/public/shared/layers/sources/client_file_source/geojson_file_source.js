/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import React from 'react';
import { ES_GEO_FIELD_TYPE, GEOJSON_FILE } from '../../../../../common/constants';
import { ClientFileCreateSourceEditor } from './create_client_file_source_editor';
import { ESSearchSource } from '../es_search_source';
import uuid from 'uuid/v4';
import _ from 'lodash';

export class GeojsonFileSource extends AbstractVectorSource {

  static type = GEOJSON_FILE;
  static title = 'Upload GeoJSON vector file';
  static description = 'Upload a GeoJSON file and index in Elasticsearch';
  static icon = 'importAction';
  static isIndexingSource = true;
  static isBeta = true;

  static createDescriptor(geoJson, name) {
    // Wrap feature as feature collection if needed
    const featureCollection = (geoJson.type === 'Feature')
      ? {
        type: 'FeatureCollection',
        features: [{ ...geoJson }]
      }
      : geoJson;

    return {
      type: GeojsonFileSource.type,
      featureCollection,
      name
    };
  }

  static viewIndexedData = (
    addAndViewSource, inspectorAdapters, importSuccessHandler, importErrorHandler
  ) => {
    return (indexResponses = {}) => {
      const { indexDataResp, indexPatternResp } = indexResponses;
      if (!(indexDataResp && indexDataResp.success) ||
        !(indexPatternResp && indexPatternResp.success)) {
        importErrorHandler(indexResponses);
        return;
      }
      const { fields, id } = indexPatternResp;
      const geoFieldArr = fields.filter(
        field => Object.values(ES_GEO_FIELD_TYPE).includes(field.type)
      );
      const geoField = _.get(geoFieldArr, '[0].name');
      const indexPatternId = id;
      if (!indexPatternId || !geoField) {
        addAndViewSource(null);
      } else {
        const source = new ESSearchSource({
          id: uuid(),
          indexPatternId,
          geoField,
        }, inspectorAdapters);
        addAndViewSource(source);
        importSuccessHandler(indexResponses);
      }
    };
  };

  static previewGeojsonFile = (onPreviewSource, inspectorAdapters) => {
    return (geojsonFile, name) => {
      if (!geojsonFile) {
        onPreviewSource(null);
        return;
      }
      const sourceDescriptor = GeojsonFileSource.createDescriptor(geojsonFile, name);
      const source = new GeojsonFileSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
  };

  static renderEditor({
    onPreviewSource, inspectorAdapters, addAndViewSource, isIndexingTriggered,
    onRemove, onIndexReady, importSuccessHandler, importErrorHandler
  }) {
    return (
      <ClientFileCreateSourceEditor
        previewGeojsonFile={
          GeojsonFileSource.previewGeojsonFile(
            onPreviewSource,
            inspectorAdapters
          )
        }
        isIndexingTriggered={isIndexingTriggered}
        onIndexingComplete={
          GeojsonFileSource.viewIndexedData(
            addAndViewSource,
            inspectorAdapters,
            importSuccessHandler,
            importErrorHandler,
          )
        }
        onRemove={onRemove}
        onIndexReady={onIndexReady}
      />
    );
  }

  async getGeoJsonWithMeta() {
    return {
      data: this._descriptor.featureCollection,
      meta: {}
    };
  }

  async getDisplayName() {
    return this._descriptor.name;
  }

  canFormatFeatureProperties() {
    return true;
  }

  shouldBeIndexed() {
    return GeojsonFileSource.isIndexingSource;
  }

}
