/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchSource } from '../es_search_source';
import {
  ES_MVT_SEARCH,
  GIS_API_PATH,
  MVT_GETTILE_API_PATH,
  ES_GEO_FIELD_TYPE,
} from '../../../../common/constants';
import { TiledVectorLayer } from '../../tiled_vector_layer';
import uuid from 'uuid/v4';
import { CreateSourceEditor } from '../es_search_source/create_source_editor';
import React from 'react';
import { i18n } from '@kbn/i18n';
import {loadIndexSettings} from "../es_search_source/load_index_settings";
import  rison from 'rison-node';

export class ESMVTSearchSource extends ESSearchSource {
  static type = ES_MVT_SEARCH;
  static title = i18n.translate('xpack.maps.source.esMvtSearchTitle', {
    defaultMessage: 'Documents as tiles',
  });
  static description = i18n.translate('xpack.maps.source.esMvtSearchDescription', {
    defaultMessage: 'Vector data from a Kibana index pattern (tiled)',
  });

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSourceConfigChange = sourceConfig => {
      if (!sourceConfig) {
        onPreviewSource(null);
        return;
      }

      const source = new ESMVTSearchSource(
        {
          id: uuid(),
          ...sourceConfig,
          type: ESMVTSearchSource.type,
          applyGlobalQuery: false,
        },
        inspectorAdapters
      );

      onPreviewSource(source);
    };
    return (
      <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} showBoundsFilter={false} geoTypes={[ES_GEO_FIELD_TYPE.GEO_SHAPE]}/>
    );
  }

  async getUrlTemplate(searchFilters) {


    const indexPattern = await this.getIndexPattern();
    const indexSettings = await loadIndexSettings(indexPattern.title);

    const searchSource = await this._makeSearchSource(searchFilters, indexSettings.maxResultWindow);
    console.log('sf', searchFilters);
    console.log('ss', searchSource);

    window._ss = searchSource;


    const ipTitle = indexPattern.title;
    const geometryFieldBame = this._descriptor.geoField;
    const fields = ['_id'];
    const fieldsParam = fields.join(',');

    const dsl = await searchSource.getSearchRequestBody();
    const dslString = JSON.stringify(dsl);
    const urlEncode = encodeURI(dslString);

    const risonDsl = rison.encode(dsl);
    console.log(risonDsl);
    console.log(urlEncode);

    return `../${GIS_API_PATH}/${MVT_GETTILE_API_PATH}?x={x}&y={y}&z={z}&geometryFieldName=${geometryFieldBame}&indexPattern=${ipTitle}&fields=${fieldsParam}&requestBody=${risonDsl}`;
  }

  getMvtSourceLayer() {
    return 'geojsonLayer';
  }
  _createDefaultLayerDescriptor(options) {
    const tvl = TiledVectorLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });

    return tvl;
  }

  renderSourceSettingsEditor({ onChange }) {
    return null;
  }

  isFilterByMapBounds() {
    return false;
  }

  isFilterByMapBoundsConfigurable() {
    return false;
  }

  isBoundsAware() {
    return false;
  }

  isRefreshTimerAware() {
    return false;
  }

  isJoinable() {
    return false;
  }

  isQueryAwareTogglable() {
    return false;
  }

  supportsESFilters() {
    return true;
  }

  async getFields() {
    return [];
  }

  async getDateFields() {
    return [];
  }

  async getNumberFields() {
    return [];
  }

  async getCategoricalFields() {
    return [];
  }

  async getImmutableProperties() {
    const ip = await super.getImmutableProperties();
    ip.push({
      label: i18n.translate('xpack.maps.source.esSearch.isMvt', {
        defaultMessage: 'Is MBVT?',
      }),
      value: 'yes is mvt',
    });
    return ip;
  }
}
