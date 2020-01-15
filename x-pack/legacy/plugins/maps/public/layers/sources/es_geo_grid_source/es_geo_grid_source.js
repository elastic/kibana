/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid/v4';

import { VECTOR_SHAPE_TYPES } from '../vector_feature_types';
import { HeatmapLayer } from '../../heatmap_layer';
import { VectorLayer } from '../../vector_layer';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { AggConfigs } from 'ui/agg_types';
import { tabifyAggResponse } from 'ui/agg_response/tabify';
import { convertToGeoJson } from './convert_to_geojson';
import { VectorStyle } from '../../styles/vector/vector_style';
import {
  getDefaultDynamicProperties,
  VECTOR_STYLES,
} from '../../styles/vector/vector_style_defaults';
import { COLOR_GRADIENTS } from '../../styles/color_utils';
import { RENDER_AS } from './render_as';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';
import { GRID_RESOLUTION } from '../../grid_resolution';
import { SOURCE_DATA_ID_ORIGIN, ES_GEO_GRID, COUNT_PROP_NAME } from '../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { AbstractESAggSource } from '../es_agg_source';
import { DynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import { StaticStyleProperty } from '../../styles/vector/properties/static_style_property';

const MAX_GEOTILE_LEVEL = 29;

const aggSchemas = new Schemas([
  AbstractESAggSource.METRIC_SCHEMA_CONFIG,
  {
    group: 'buckets',
    name: 'segment',
    title: 'Geo Grid',
    aggFilter: 'geotile_grid',
    min: 1,
    max: 1,
  },
]);

export class ESGeoGridSource extends AbstractESAggSource {
  static type = ES_GEO_GRID;
  static title = i18n.translate('xpack.maps.source.esGridTitle', {
    defaultMessage: 'Grid aggregation',
  });
  static description = i18n.translate('xpack.maps.source.esGridDescription', {
    defaultMessage: 'Geospatial data grouped in grids with metrics for each gridded cell',
  });

  static createDescriptor({ indexPatternId, geoField, requestType, resolution }) {
    return {
      type: ESGeoGridSource.type,
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

      const sourceDescriptor = ESGeoGridSource.createDescriptor(sourceConfig);
      const source = new ESGeoGridSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };

    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        indexPatternId={this._descriptor.indexPatternId}
        onChange={onChange}
        metrics={this._descriptor.metrics}
        renderAs={this._descriptor.requestType}
        resolution={this._descriptor.resolution}
      />
    );
  }

  async getImmutableProperties() {
    let indexPatternTitle = this._descriptor.indexPatternId;
    try {
      const indexPattern = await this.getIndexPattern();
      indexPatternTitle = indexPattern.title;
    } catch (error) {
      // ignore error, title will just default to id
    }

    return [
      {
        label: getDataSourceLabel(),
        value: ESGeoGridSource.title,
      },
      {
        label: i18n.translate('xpack.maps.source.esGrid.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        }),
        value: indexPatternTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.esGrid.geospatialFieldLabel', {
          defaultMessage: 'Geospatial field',
        }),
        value: this._descriptor.geoField,
      },
      {
        label: i18n.translate('xpack.maps.source.esGrid.showasFieldLabel', {
          defaultMessage: 'Show as',
        }),
        value: this._descriptor.requestType,
      },
    ];
  }

  getFieldNames() {
    return this.getMetricFields().map(esAggMetricField => esAggMetricField.getName());
  }

  isGeoGridPrecisionAware() {
    return true;
  }

  isJoinable() {
    return false;
  }

  getGridResolution() {
    return this._descriptor.resolution;
  }

  getGeoGridPrecision(zoom) {
    const targetGeotileLevel = Math.ceil(zoom) + this._getGeoGridPrecisionResolutionDelta();
    return Math.min(targetGeotileLevel, MAX_GEOTILE_LEVEL);
  }

  _getGeoGridPrecisionResolutionDelta() {
    if (this._descriptor.resolution === GRID_RESOLUTION.COARSE) {
      return 2;
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.FINE) {
      return 3;
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.MOST_FINE) {
      return 4;
    }

    throw new Error(
      i18n.translate('xpack.maps.source.esGrid.resolutionParamErrorMessage', {
        defaultMessage: `Grid resolution param not recognized: {resolution}`,
        values: {
          resolution: this._descriptor.resolution,
        },
      })
    );
  }

  async getGeoJsonWithMeta(layerName, searchFilters, registerCancelCallback) {
    const indexPattern = await this.getIndexPattern();
    const searchSource = await this._makeSearchSource(searchFilters, 0);
    const aggConfigs = new AggConfigs(
      indexPattern,
      this._makeAggConfigs(searchFilters.geogridPrecision),
      aggSchemas.all
    );
    searchSource.setField('aggs', aggConfigs.toDsl());
    const esResponse = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.esGrid.inspectorDescription', {
        defaultMessage: 'Elasticsearch geo grid aggregation request',
      }),
    });

    const tabifiedResp = tabifyAggResponse(aggConfigs, esResponse);
    const { featureCollection } = convertToGeoJson({
      table: tabifiedResp,
      renderAs: this._descriptor.requestType,
    });

    return {
      data: featureCollection,
      meta: {
        areResultsTrimmed: false,
      },
    };
  }

  isFilterByMapBounds() {
    return true;
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

  _createHeatmapLayerDescriptor(options) {
    return HeatmapLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });
  }

  _createVectorLayerDescriptor(options) {
    const descriptor = VectorLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });

    const defaultDynamicProperties = getDefaultDynamicProperties();

    descriptor.style = VectorStyle.createDescriptor({
      [VECTOR_STYLES.FILL_COLOR]: {
        type: DynamicStyleProperty.type,
        options: {
          ...defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR].options,
          field: {
            name: COUNT_PROP_NAME,
            origin: SOURCE_DATA_ID_ORIGIN,
          },
          color: COLOR_GRADIENTS[0].value,
        },
      },
      [VECTOR_STYLES.LINE_COLOR]: {
        type: StaticStyleProperty.type,
        options: {
          color: '#FFF',
        },
      },
      [VECTOR_STYLES.LINE_WIDTH]: {
        type: StaticStyleProperty.type,
        options: {
          size: 0,
        },
      },
      [VECTOR_STYLES.ICON_SIZE]: {
        type: DynamicStyleProperty.type,
        options: {
          ...defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE].options,
          field: {
            name: COUNT_PROP_NAME,
            origin: SOURCE_DATA_ID_ORIGIN,
          },
        },
      },
      [VECTOR_STYLES.LABEL_TEXT]: {
        type: DynamicStyleProperty.type,
        options: {
          ...defaultDynamicProperties[VECTOR_STYLES.LABEL_TEXT].options,
          field: {
            name: COUNT_PROP_NAME,
            origin: SOURCE_DATA_ID_ORIGIN,
          },
        },
      },
    });
    return descriptor;
  }

  createDefaultLayer(options) {
    if (this._descriptor.requestType === RENDER_AS.HEATMAP) {
      return new HeatmapLayer({
        layerDescriptor: this._createHeatmapLayerDescriptor(options),
        source: this,
      });
    }

    const layerDescriptor = this._createVectorLayerDescriptor(options);
    const style = new VectorStyle(layerDescriptor.style, this);
    return new VectorLayer({
      layerDescriptor,
      source: this,
      style,
    });
  }

  canFormatFeatureProperties() {
    return true;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    return await this.filterAndFormatPropertiesToHtmlForMetricFields(properties);
  }

  async getSupportedShapeTypes() {
    if (this._descriptor.requestType === RENDER_AS.GRID) {
      return [VECTOR_SHAPE_TYPES.POLYGON];
    }

    return [VECTOR_SHAPE_TYPES.POINT];
  }
}
