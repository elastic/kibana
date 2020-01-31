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
  ES_GEO_FIELD_TYPE, MVT_SOURCE_ID,
} from '../../../../common/constants';
import { TiledVectorLayer } from '../../tiled_vector_layer';
import uuid from 'uuid/v4';
import { CreateSourceEditor } from '../es_search_source/create_source_editor';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { loadIndexSettings } from '../es_search_source/load_index_settings';
import rison from 'rison-node';
import { UpdateSourceEditor } from '../es_search_source/update_source_editor';

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
          applyGlobalQuery: true,
        },
        inspectorAdapters
      );

      onPreviewSource(source);
    };
    return (
      <CreateSourceEditor
        onSourceConfigChange={onSourceConfigChange}
        showBoundsFilter={false}
        geoTypes={[ES_GEO_FIELD_TYPE.GEO_SHAPE]}
      />
    );
  }

  async getUrlTemplate(searchFilters) {
    const indexPattern = await this.getIndexPattern();
    const indexSettings = await loadIndexSettings(indexPattern.title);

    //assuming only geo_shape fields for now
    const initialSearchContext = {
      docvalue_fields: await this._getDateDocvalueFields(searchFilters.fieldNames),
    };
    const geoField = await this._getGeoField();
    const docValueFields = await this._excludeDateFields(searchFilters.fieldNames);
    const withoutGeoField = docValueFields.filter(field => field !== geoField.name);

    initialSearchContext.docvalue_fields.push(...withoutGeoField);

    const searchSource = await this._makeSearchSource(
      searchFilters,
      indexSettings.maxResultWindow,
      initialSearchContext
    );
    searchSource.setField('fields', searchFilters.fieldNames);
    window._ss = searchSource;

    const ipTitle = indexPattern.title;
    const geometryFieldBame = this._descriptor.geoField;
    const fields = ['_id'];
    const fieldsParam = fields.join(',');

    const dsl = await searchSource.getSearchRequestBody();
    const risonDsl = rison.encode(dsl);

    return `../${GIS_API_PATH}/${MVT_GETTILE_API_PATH}?x={x}&y={y}&z={z}&geometryFieldName=${geometryFieldBame}&indexPattern=${ipTitle}&fields=${fieldsParam}&requestBody=${risonDsl}`;
  }

  getMvtSourceLayer() {
    return MVT_SOURCE_ID;
  }

  isTileSource() {
    return true;
  }

  _createDefaultLayerDescriptor(options) {
    const tvl = TiledVectorLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });

    return tvl;
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        source={this}
        indexPatternId={this._descriptor.indexPatternId}
        onChange={onChange}
        tooltipFields={this._tooltipFields}
        sortField={this._descriptor.sortField}
        sortOrder={this._descriptor.sortOrder}
        useTopHits={this._descriptor.useTopHits}
        topHitsSplitField={this._descriptor.topHitsSplitField}
        topHitsSize={this._descriptor.topHitsSize}
        showSorting={false}
      />
    );
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
