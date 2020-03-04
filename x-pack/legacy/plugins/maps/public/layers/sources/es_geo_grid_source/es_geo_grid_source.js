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
import { convertCompositeRespToGeoJson, convertRegularRespToGeoJson } from './convert_to_geojson';
import { VectorStyle } from '../../styles/vector/vector_style';
import {
  getDefaultDynamicProperties,
  VECTOR_STYLES,
} from '../../styles/vector/vector_style_defaults';
import { COLOR_GRADIENTS } from '../../styles/color_utils';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';
import {
  AGG_TYPE,
  DEFAULT_MAX_BUCKETS_LIMIT,
  SOURCE_DATA_ID_ORIGIN,
  ES_GEO_GRID,
  COUNT_PROP_NAME,
  COLOR_MAP_TYPE,
  RENDER_AS,
  GRID_RESOLUTION,
} from '../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { AbstractESAggSource } from '../es_agg_source';
import { DynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import { StaticStyleProperty } from '../../styles/vector/properties/static_style_property';
import { DataRequestAbortError } from '../../util/data_request';

const MAX_GEOTILE_LEVEL = 29;

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

  async _compositeAggRequest({
    searchSource,
    indexPattern,
    precision,
    layerName,
    registerCancelCallback,
    bucketsPerGrid,
    isRequestStillActive,
  }) {
    const gridsPerRequest = Math.floor(DEFAULT_MAX_BUCKETS_LIMIT / bucketsPerGrid);
    const aggs = {
      compositeSplit: {
        composite: {
          size: gridsPerRequest,
          sources: [
            {
              gridSplit: {
                geotile_grid: {
                  field: this._descriptor.geoField,
                  precision,
                },
              },
            },
          ],
        },
        aggs: {
          gridCentroid: {
            geo_centroid: {
              field: this._descriptor.geoField,
            },
          },
          ...this.getValueAggsDsl(indexPattern),
        },
      },
    };

    const features = [];
    let requestCount = 0;
    let afterKey = null;
    while (true) {
      if (!isRequestStillActive()) {
        // Stop paging through results if request is obsolete
        throw new DataRequestAbortError();
      }

      requestCount++;

      // circuit breaker to ensure reasonable number of requests
      if (requestCount > 5) {
        throw new Error(
          i18n.translate('xpack.maps.source.esGrid.compositePaginationErrorMessage', {
            defaultMessage: `{layerName} is causing too many requests. Reduce "Grid resolution" and/or reduce the number of top term "Metrics".`,
            values: { layerName },
          })
        );
      }

      if (afterKey) {
        aggs.compositeSplit.composite.after = afterKey;
      }
      searchSource.setField('aggs', aggs);
      const requestId = afterKey ? `${this.getId()} afterKey ${afterKey.geoSplit}` : this.getId();
      const esResponse = await this._runEsQuery({
        requestId,
        requestName: `${layerName} (${requestCount})`,
        searchSource,
        registerCancelCallback,
        requestDescription: i18n.translate(
          'xpack.maps.source.esGrid.compositeInspectorDescription',
          {
            defaultMessage: 'Elasticsearch geo grid aggregation request: {requestId}',
            values: { requestId },
          }
        ),
      });

      features.push(...convertCompositeRespToGeoJson(esResponse, this._descriptor.requestType));

      afterKey = esResponse.aggregations.compositeSplit.after_key;
      if (esResponse.aggregations.compositeSplit.buckets.length < gridsPerRequest) {
        // Finished because request did not get full resultset back
        break;
      }
    }

    return features;
  }

  // Do not use composite aggregation when there are no terms sub-aggregations
  // see https://github.com/elastic/kibana/pull/57875#issuecomment-590515482 for explanation on using separate code paths
  async _nonCompositeAggRequest({
    searchSource,
    indexPattern,
    precision,
    layerName,
    registerCancelCallback,
  }) {
    searchSource.setField('aggs', {
      gridSplit: {
        geotile_grid: {
          field: this._descriptor.geoField,
          precision,
        },
        aggs: {
          gridCentroid: {
            geo_centroid: {
              field: this._descriptor.geoField,
            },
          },
          ...this.getValueAggsDsl(indexPattern),
        },
      },
    });

    const esResponse = await this._runEsQuery({
      requestId: this.getId(),
      requestName: layerName,
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.esGrid.inspectorDescription', {
        defaultMessage: 'Elasticsearch geo grid aggregation request',
      }),
    });

    return convertRegularRespToGeoJson(esResponse, this._descriptor.requestType);
  }

  async getGeoJsonWithMeta(layerName, searchFilters, registerCancelCallback, isRequestStillActive) {
    const indexPattern = await this.getIndexPattern();
    const searchSource = await this._makeSearchSource(searchFilters, 0);

    let bucketsPerGrid = 1;
    this.getMetricFields().forEach(metricField => {
      if (metricField.getAggType() === AGG_TYPE.TERMS) {
        // each terms aggregation increases the overall number of buckets per grid
        bucketsPerGrid++;
      }
    });

    const features =
      bucketsPerGrid === 1
        ? await this._nonCompositeAggRequest({
            searchSource,
            indexPattern,
            precision: searchFilters.geogridPrecision,
            layerName,
            registerCancelCallback,
          })
        : await this._compositeAggRequest({
            searchSource,
            indexPattern,
            precision: searchFilters.geogridPrecision,
            layerName,
            registerCancelCallback,
            bucketsPerGrid,
            isRequestStillActive,
          });

    return {
      data: {
        type: 'FeatureCollection',
        features: features,
      },
      meta: {
        areResultsTrimmed: false,
      },
    };
  }

  isFilterByMapBounds() {
    return true;
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
          type: COLOR_MAP_TYPE.ORDINAL,
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
