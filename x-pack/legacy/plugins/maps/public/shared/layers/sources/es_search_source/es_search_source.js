/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import uuid from 'uuid/v4';

import { VECTOR_SHAPE_TYPES } from '../vector_feature_types';
import { AbstractESSource } from '../es_source';
import { SearchSource } from '../../../../kibana_services';
import { hitsToGeoJson } from '../../../../elasticsearch_geo_utils';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';
import { ES_SEARCH, ES_GEO_FIELD_TYPE, DEFAULT_ES_DOC_LIMIT } from '../../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../../common/i18n_getters';
import { ESTooltipProperty } from '../../tooltips/es_tooltip_property';
import { getTermsFields } from '../../../utils/get_terms_fields';

import { DEFAULT_FILTER_BY_MAP_BOUNDS } from './constants';

export class ESSearchSource extends AbstractESSource {

  static type = ES_SEARCH;
  static title = i18n.translate('xpack.maps.source.esSearchTitle', {
    defaultMessage: 'Documents'
  });
  static description = i18n.translate('xpack.maps.source.esSearchDescription', {
    defaultMessage: 'Geospatial data from a Kibana index pattern'
  });

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSelect = (sourceConfig) => {
      if (!sourceConfig) {
        onPreviewSource(null);
        return;
      }

      const source = new ESSearchSource({
        id: uuid(),
        ...sourceConfig
      }, inspectorAdapters);
      onPreviewSource(source);
    };
    return (<CreateSourceEditor onSelect={onSelect}/>);
  }

  constructor(descriptor, inspectorAdapters) {
    super({
      id: descriptor.id,
      type: ESSearchSource.type,
      indexPatternId: descriptor.indexPatternId,
      geoField: descriptor.geoField,
      filterByMapBounds: _.get(descriptor, 'filterByMapBounds', DEFAULT_FILTER_BY_MAP_BOUNDS),
      tooltipProperties: _.get(descriptor, 'tooltipProperties', []),
      useTopHits: _.get(descriptor, 'useTopHits', false),
      topHitsSplitField: descriptor.topHitsSplitField,
      topHitsTimeField: descriptor.topHitsTimeField,
      topHitsSize: _.get(descriptor, 'topHitsSize', 1),
    }, inspectorAdapters);
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        indexPatternId={this._descriptor.indexPatternId}
        onChange={onChange}
        filterByMapBounds={this._descriptor.filterByMapBounds}
        tooltipProperties={this._descriptor.tooltipProperties}
        useTopHits={this._descriptor.useTopHits}
        topHitsSplitField={this._descriptor.topHitsSplitField}
        topHitsTimeField={this._descriptor.topHitsTimeField}
        topHitsSize={this._descriptor.topHitsSize}
      />
    );
  }

  async getNumberFields() {
    try {
      const indexPattern = await this._getIndexPattern();
      return indexPattern.fields.byType.number.map(field => {
        return { name: field.name, label: field.name };
      });
    } catch (error) {
      return [];
    }
  }

  getMetricFields() {
    return [];
  }

  getFieldNames() {
    return [this._descriptor.geoField];
  }

  async getImmutableProperties() {
    let indexPatternTitle = this._descriptor.indexPatternId;
    let geoFieldType = '';
    try {
      const indexPattern = await this._getIndexPattern();
      indexPatternTitle = indexPattern.title;
      const geoField = await this._getGeoField();
      geoFieldType = geoField.type;
    } catch (error) {
      // ignore error, title will just default to id
    }

    return [
      {
        label: getDataSourceLabel(),
        value: ESSearchSource.title
      },
      {
        label: i18n.translate('xpack.maps.source.esSearch.indexPatternLabel', {
          defaultMessage: `Index pattern`,
        }),
        value: indexPatternTitle
      },
      {
        label: i18n.translate('xpack.maps.source.esSearch.geoFieldLabel', {
          defaultMessage: 'Geospatial field',
        }),
        value: this._descriptor.geoField
      },
      {
        label: i18n.translate('xpack.maps.source.esSearch.geoFieldTypeLabel', {
          defaultMessage: 'Geospatial field type',
        }),
        value: geoFieldType
      },
    ];
  }

  async _getTopHits(layerName, searchFilters) {
    const {
      topHitsSplitField,
      topHitsTimeField,
      topHitsSize,
    } = this._descriptor;

    const searchSource = await this._makeSearchSource(searchFilters, 0);
    searchSource.setField('aggs', {
      entitySplit: {
        terms: {
          field: topHitsSplitField,
          size: 10000
        },
        aggs: {
          entityHits: {
            top_hits: {
              sort: [
                {
                  [topHitsTimeField]: {
                    order: 'desc'
                  }
                }
              ],
              _source: {
                includes: searchFilters.fieldNames
              },
              size: topHitsSize
            }
          }
        }
      }
    });

    const resp = await this._runEsQuery(layerName, searchSource, 'Elasticsearch document top hits request');

    let hasTrimmedResults = false;
    const allHits = [];
    const entityBuckets = _.get(resp, 'aggregations.entitySplit.buckets', []);
    entityBuckets.forEach(entityBucket => {
      const total = _.get(entityBucket, 'entityHits.hits.total', 0);
      const hits = _.get(entityBucket, 'entityHits.hits.hits', []);
      // Reverse hits list so they are drawn from oldest to newest (per entity) so newest events are on top
      allHits.push(...hits.reverse());
      if (total > hits.length) {
        hasTrimmedResults = true;
      }
    });

    return {
      hits: allHits,
      meta: {
        areResultsTrimmed: hasTrimmedResults,
        entityCount: entityBuckets.length,
      }
    };
  }

  async _getSearchHits(layerName, searchFilters) {
    const searchSource = await this._makeSearchSource(searchFilters, DEFAULT_ES_DOC_LIMIT);
    // Setting "fields" instead of "source: { includes: []}"
    // because SearchSource automatically adds the following by default
    // 1) all scripted fields
    // 2) docvalue_fields value is added for each date field in an index - see getComputedFields
    // By setting "fields", SearchSource removes all of defaults
    searchSource.setField('fields', searchFilters.fieldNames);

    const resp = await this._runEsQuery(layerName, searchSource, 'Elasticsearch document request');

    return {
      hits: resp.hits.hits,
      meta: {
        areResultsTrimmed: resp.hits.total > resp.hits.hits.length
      }
    };
  }

  _isTopHits() {
    const { useTopHits, topHitsSplitField, topHitsTimeField } = this._descriptor;
    return !!(useTopHits && topHitsSplitField && topHitsTimeField);
  }

  async getGeoJsonWithMeta(layerName, searchFilters) {
    const { hits, meta } = this._isTopHits()
      ? await this._getTopHits(layerName, searchFilters)
      : await this._getSearchHits(layerName, searchFilters);

    const indexPattern = await this._getIndexPattern();
    const unusedMetaFields = indexPattern.metaFields.filter(metaField => {
      return metaField !== '_id';
    });
    const flattenHit = hit => {
      const properties = indexPattern.flattenHit(hit);
      // remove metaFields
      unusedMetaFields.forEach(metaField => {
        delete properties[metaField];
      });
      return properties;
    };

    let featureCollection;
    try {
      const geoField = await this._getGeoField();
      featureCollection = hitsToGeoJson(hits, flattenHit, geoField.name, geoField.type);
    } catch(error) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSearch.convertToGeoJsonErrorMsg', {
          defaultMessage: 'Unable to convert search response to geoJson feature collection, error: {errorMsg}',
          values: { errorMsg: error.message }
        })
      );
    }

    return {
      data: featureCollection,
      meta
    };
  }

  canFormatFeatureProperties() {
    return this._descriptor.tooltipProperties.length > 0;
  }

  async _loadTooltipProperties(docId, indexPattern) {
    if (this._descriptor.tooltipProperties.length === 0) {
      return {};
    }

    const searchSource = new SearchSource();
    searchSource.setField('index', indexPattern);
    searchSource.setField('size', 1);
    const query = {
      language: 'kuery',
      query: `_id:${docId}`
    };
    searchSource.setField('query', query);
    searchSource.setField('fields', this._descriptor.tooltipProperties);

    const resp = await searchSource.fetch();

    const hit = _.get(resp, 'hits.hits[0]');
    if (!hit) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSearch.loadTooltipPropertiesErrorMsg', {
          defaultMessage: 'Unable to find document, _id: {docId}',
          values: { docId }
        })
      );
    }

    const properties = indexPattern.flattenHit(hit);
    indexPattern.metaFields.forEach(metaField => {
      delete properties[metaField];
    });
    return properties;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    const indexPattern = await this._getIndexPattern();
    const propertyValues = await this._loadTooltipProperties(properties._id, indexPattern);

    return this._descriptor.tooltipProperties.map(propertyName => {
      return new ESTooltipProperty(propertyName, propertyValues[propertyName], indexPattern);
    });
  }

  isFilterByMapBounds() {
    return _.get(this._descriptor, 'filterByMapBounds', false);
  }

  async getLeftJoinFields() {
    const indexPattern = await this._getIndexPattern();
    return getTermsFields(indexPattern.fields)
      .map(field => {
        return { name: field.name, label: field.name };
      });
  }

  async getSupportedShapeTypes() {
    let geoFieldType;
    try {
      const geoField = await this._getGeoField();
      geoFieldType = geoField.type;
    } catch(error) {
      // ignore exeception
    }

    if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
      return [VECTOR_SHAPE_TYPES.POINT];
    }

    return [
      VECTOR_SHAPE_TYPES.POINT,
      VECTOR_SHAPE_TYPES.LINE,
      VECTOR_SHAPE_TYPES.POLYGON
    ];
  }

  getSourceTooltipContent(sourceDataRequest) {
    const featureCollection = sourceDataRequest ? sourceDataRequest.getData() : null;
    const meta = sourceDataRequest ? sourceDataRequest.getMeta() : null;
    if (!featureCollection || !meta) {
      // no tooltip content needed when there is no feature collection or meta
      return null;
    }

    if (this._isTopHits()) {
      const entitiesFoundMsg = i18n.translate('xpack.maps.esSearch.topHitsEntitiesCountMsg', {
        defaultMessage: `Found {entityCount} entities.`,
        values: { entityCount: meta.entityCount }
      });
      if (meta.areResultsTrimmed) {
        const trimmedMsg = i18n.translate('xpack.maps.esSearch.topHitsResultsTrimmedMsg', {
          defaultMessage: `Results limited to most recent {topHitsSize} documents per entity.`,
          values: { topHitsSize: this._descriptor.topHitsSize }
        });
        return `${entitiesFoundMsg} ${trimmedMsg}`;
      }

      return entitiesFoundMsg;
    }

    if (meta.areResultsTrimmed) {
      return i18n.translate('xpack.maps.esSearch.resultsTrimmedMsg', {
        defaultMessage: `Results limited to first {count} documents.`,
        values: { count: featureCollection.features.length }
      });
    }

    return i18n.translate('xpack.maps.esSearch.featureCountMsg', {
      defaultMessage: `Found {count} documents.`,
      values: { count: featureCollection.features.length }
    });
  }

  getSyncMeta() {
    return {
      useTopHits: this._descriptor.useTopHits,
      topHitsSplitField: this._descriptor.topHitsSplitField,
      topHitsTimeField: this._descriptor.topHitsTimeField,
      topHitsSize: this._descriptor.topHitsSize,
    };
  }
}
