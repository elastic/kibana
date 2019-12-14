/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid/v4';

import { VECTOR_SHAPE_TYPES } from '../vector_feature_types';
import { AbstractESSource } from '../es_source';
import { VectorLayer } from '../../vector_layer';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';
import { VectorStyle } from '../../styles/vector_style';
import { vectorStyles } from '../../styles/vector_style_defaults';
import { i18n } from '@kbn/i18n';
import { SOURCE_DATA_ID_ORIGIN, ES_PEW_PEW } from '../../../../common/constants';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { convertToLines } from './convert_to_lines';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { AggConfigs } from 'ui/agg_types';

const COUNT_PROP_LABEL = 'count';
const COUNT_PROP_NAME = 'doc_count';
const MAX_GEOTILE_LEVEL = 29;

const aggSchemas = new Schemas([
  {
    group: 'metrics',
    name: 'metric',
    title: 'Value',
    min: 1,
    max: Infinity,
    aggFilter: ['avg', 'count', 'max', 'min', 'sum'],
    defaults: [{ schema: 'metric', type: 'count' }],
  },
]);

export class ESPewPewSource extends AbstractESSource {
  static type = ES_PEW_PEW;
  static title = i18n.translate('xpack.maps.source.pewPewTitle', {
    defaultMessage: 'Point to point',
  });
  static description = i18n.translate('xpack.maps.source.pewPewDescription', {
    defaultMessage: 'Aggregated data paths between the source and destination',
  });

  static createDescriptor({ indexPatternId, sourceGeoField, destGeoField }) {
    return {
      type: ESPewPewSource.type,
      id: uuid(),
      indexPatternId: indexPatternId,
      sourceGeoField,
      destGeoField,
    };
  }

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSourceConfigChange = sourceConfig => {
      if (!sourceConfig) {
        onPreviewSource(null);
        return;
      }

      const sourceDescriptor = ESPewPewSource.createDescriptor(sourceConfig);
      const source = new ESPewPewSource(sourceDescriptor, inspectorAdapters);
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
      />
    );
  }

  isFilterByMapBounds() {
    return true;
  }

  isJoinable() {
    return false;
  }

  isGeoGridPrecisionAware() {
    return true;
  }

  async getNumberFields() {
    return this.getMetricFields().map(({ propertyKey: name, propertyLabel: label }) => {
      return { label, name };
    });
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPES.LINE];
  }

  async getImmutableProperties() {
    let indexPatternTitle = this._descriptor.indexPatternId;
    try {
      const indexPattern = await this._getIndexPattern();
      indexPatternTitle = indexPattern.title;
    } catch (error) {
      // ignore error, title will just default to id
    }

    return [
      {
        label: getDataSourceLabel(),
        value: ESPewPewSource.title,
      },
      {
        label: i18n.translate('xpack.maps.source.pewPew.indexPatternLabel', {
          defaultMessage: 'Index pattern',
        }),
        value: indexPatternTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.pewPew.sourceGeoFieldLabel', {
          defaultMessage: 'Source',
        }),
        value: this._descriptor.sourceGeoField,
      },
      {
        label: i18n.translate('xpack.maps.source.pewPew.destGeoFieldLabel', {
          defaultMessage: 'Destination',
        }),
        value: this._descriptor.destGeoField,
      },
    ];
  }

  createDefaultLayer(options) {
    const styleDescriptor = VectorStyle.createDescriptor({
      [vectorStyles.LINE_COLOR]: {
        type: VectorStyle.STYLE_TYPE.DYNAMIC,
        options: {
          field: {
            label: COUNT_PROP_LABEL,
            name: COUNT_PROP_NAME,
            origin: SOURCE_DATA_ID_ORIGIN,
          },
          color: 'Blues',
        },
      },
      [vectorStyles.LINE_WIDTH]: {
        type: VectorStyle.STYLE_TYPE.DYNAMIC,
        options: {
          field: {
            label: COUNT_PROP_LABEL,
            name: COUNT_PROP_NAME,
            origin: SOURCE_DATA_ID_ORIGIN,
          },
          minSize: 4,
          maxSize: 32,
        },
      },
    });

    return new VectorLayer({
      layerDescriptor: VectorLayer.createDescriptor({
        ...options,
        sourceDescriptor: this._descriptor,
        style: styleDescriptor,
      }),
      source: this,
      style: new VectorStyle(styleDescriptor, this),
    });
  }

  getGeoGridPrecision(zoom) {
    const targetGeotileLevel = Math.ceil(zoom) + 2;
    return Math.min(targetGeotileLevel, MAX_GEOTILE_LEVEL);
  }

  async getGeoJsonWithMeta(layerName, searchFilters, registerCancelCallback) {
    const indexPattern = await this._getIndexPattern();
    const metricAggConfigs = this.getMetricFields().map(metric => {
      const metricAggConfig = {
        id: metric.propertyKey,
        enabled: true,
        type: metric.type,
        schema: 'metric',
        params: {},
      };
      if (metric.type !== 'count') {
        metricAggConfig.params = { field: metric.field };
      }
      return metricAggConfig;
    });
    const aggConfigs = new AggConfigs(indexPattern, metricAggConfigs, aggSchemas.all);

    const searchSource = await this._makeSearchSource(searchFilters, 0);
    searchSource.setField('aggs', {
      destSplit: {
        terms: {
          script: {
            source: `doc['${this._descriptor.destGeoField}'].value.toString()`,
            lang: 'painless',
          },
          order: {
            _count: 'desc',
          },
          size: 100,
        },
        aggs: {
          sourceGrid: {
            geotile_grid: {
              field: this._descriptor.sourceGeoField,
              precision: searchFilters.geogridPrecision,
              size: 500,
            },
            aggs: {
              sourceCentroid: {
                geo_centroid: {
                  field: this._descriptor.sourceGeoField,
                },
              },
              ...aggConfigs.toDsl(),
            },
          },
        },
      },
    });

    const esResponse = await this._runEsQuery(
      layerName,
      searchSource,
      registerCancelCallback,
      i18n.translate('xpack.maps.source.pewPew.inspectorDescription', {
        defaultMessage: 'Source-destination connections request',
      })
    );

    const { featureCollection } = convertToLines(esResponse);

    return {
      data: featureCollection,
      meta: {
        areResultsTrimmed: false,
      },
    };
  }

  _formatMetricKey(metric) {
    return metric.type !== 'count' ? `${metric.type}_of_${metric.field}` : COUNT_PROP_NAME;
  }

  _formatMetricLabel(metric) {
    return metric.type !== 'count' ? `${metric.type} of ${metric.field}` : COUNT_PROP_LABEL;
  }

  async _getGeoField() {
    const indexPattern = await this._getIndexPattern();
    const geoField = indexPattern.fields.getByName(this._descriptor.destGeoField);
    if (!geoField) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSource.noGeoFieldErrorMessage', {
          defaultMessage: `Index pattern {indexPatternTitle} no longer contains the geo field {geoField}`,
          values: { indexPatternTitle: indexPattern.title, geoField: this._descriptor.geoField },
        })
      );
    }
    return geoField;
  }

  canFormatFeatureProperties() {
    return true;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    return await this.filterAndFormatPropertiesToHtmlForMetricFields(properties);
  }
}
