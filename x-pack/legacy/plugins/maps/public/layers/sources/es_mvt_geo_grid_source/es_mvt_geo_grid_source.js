/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchSource } from '../es_search_source';
import { AggConfigs, Schemas } from 'ui/agg_types';
import {
  ES_MVT_SEARCH,
  GIS_API_PATH,
  MVT_GETTILE_API_PATH,
  ES_GEO_FIELD_TYPE,
  ES_MVT_GEO_GRID,
  COUNT_PROP_NAME,
  SOURCE_DATA_ID_ORIGIN,
  COLOR_MAP_TYPE,
  MVT_SOURCE_ID, MVT_GETGRIDTILE_API_PATH,
} from '../../../../common/constants';
import { TiledVectorLayer } from '../../tiled_vector_layer';
import uuid from 'uuid/v4';
import { CreateSourceEditor } from '../es_geo_grid_source/create_source_editor';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { loadIndexSettings } from '../es_search_source/load_index_settings';
import rison from 'rison-node';
import { UpdateSourceEditor } from '../es_geo_grid_source/update_source_editor';
import { ESGeoGridSource, aggSchemas } from '../es_geo_grid_source';
import { GRID_RESOLUTION } from '../../grid_resolution';
import { RENDER_AS } from '../es_geo_grid_source/render_as';
import { HeatmapLayer } from '../../heatmap_layer';
import { VectorStyle } from '../../styles/vector/vector_style';
import { VectorLayer } from '../../vector_layer';
import {
  getDefaultDynamicProperties,
  VECTOR_STYLES,
} from '../../styles/vector/vector_style_defaults';
import { DynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import { COLOR_GRADIENTS } from '../../styles/color_utils';
import { StaticStyleProperty } from '../../styles/vector/properties/static_style_property';

export class ESMVTGeoGridSource extends ESGeoGridSource {
  static type = ES_MVT_GEO_GRID;
  static title = i18n.translate('xpack.maps.source.esMvtSearchTitle', {
    defaultMessage: 'Grids as tiles',
  });
  static description = i18n.translate('xpack.maps.source.esMvtSearchDescription', {
    defaultMessage: 'Grid agg with tiles',
  });

  static createDescriptor({ indexPatternId, geoField, requestType, resolution }) {
    return {
      type: ESMVTGeoGridSource.type,
      id: uuid(),
      indexPatternId: indexPatternId,
      geoField: geoField,
      requestType: requestType,
      resolution: resolution ? resolution : GRID_RESOLUTION.COARSE,
    };
  }

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSourceConfigChange = sourceConfig => {
      if (!sourceConfig) {
        onPreviewSource(null);
        return;
      }

      const sourceDescriptor = ESMVTGeoGridSource.createDescriptor(sourceConfig);
      const source = new ESMVTGeoGridSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };

    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} clustersOnly={true} />;
  }

  _makeAggConfigs(precision) {
    const metricAggConfigs = this.createMetricAggConfigs();
    return [
      ...metricAggConfigs,
      {
        id: 'grid',
        enabled: true,
        type: 'geotile_grid',
        schema: 'segment',
        params: {
          field: this._descriptor.geoField,
          useGeocentroid: true,
          precision: precision,
        },
      },
    ];
  }

  async _makeSearchSourceWithAggConfigs(searchFilters) {
    const indexPattern = await this.getIndexPattern();
    const searchSource = await this._makeSearchSource(searchFilters, 0);
    const aggConfigs = new AggConfigs(
      indexPattern,
      this._makeAggConfigs(searchFilters.geogridPrecision),
      aggSchemas.all
    );
    searchSource.setField('aggs', aggConfigs.toDsl());
    return { searchSource, aggConfigs };
  }

  async getUrlTemplate(searchFilters) {

    const indexPattern = await this.getIndexPattern();

    const geoFieldName = this._descriptor.geoField;

    const { searchSource, aggConfigs } = await this._makeSearchSourceWithAggConfigs(searchFilters);


    const dsl = await searchSource.getSearchRequestBody();
    const risonDsl = rison.encode(dsl);

    const aggConfigNames = aggConfigs.aggs.map(config => config.id);
    const aggNames = aggConfigNames.join(',');
    const ipTitle = indexPattern.title;


    return `../${GIS_API_PATH}/${MVT_GETGRIDTILE_API_PATH}?x={x}&y={y}&z={z}&geometryFieldName=${geoFieldName}&aggNames=${aggNames}&indexPattern=${ipTitle}&requestBody=${risonDsl}`;
  }

  getMvtSourceLayer() {
    return MVT_SOURCE_ID;
  }

  isTileSource() {
    return true;
  }

  _createTiledVectorLayerDescriptor(options) {
    const descriptor = TiledVectorLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });
    descriptor.style = VectorStyle.createDescriptor({});
    return descriptor;
  }

  createDefaultLayer(options) {
    const layerDescriptor = this._createTiledVectorLayerDescriptor(options);
    const style = new VectorStyle(layerDescriptor.style, this);
    return new TiledVectorLayer({
      layerDescriptor,
      source: this,
      style,
    });
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        indexPatternId={this._descriptor.indexPatternId}
        onChange={onChange}
        metrics={this._descriptor.metrics}
        renderAs={this._descriptor.requestType}
        resolution={this._descriptor.resolution}
        showResolution={false}
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
