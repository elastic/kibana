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
import { SearchSource } from '../../../kibana_services';
import { hitsToGeoJson } from '../../../elasticsearch_geo_utils';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';
import {
  ES_SEARCH,
  ES_GEO_FIELD_TYPE,
  ES_SIZE_LIMIT,
  SORT_ORDER,
} from '../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { ESTooltipProperty } from '../../tooltips/es_tooltip_property';
import { getSourceFields } from '../../../index_pattern_util';

import { DEFAULT_FILTER_BY_MAP_BOUNDS } from './constants';

export class ESSearchSource extends AbstractESSource {
  static type = ES_SEARCH;
  static title = i18n.translate('xpack.maps.source.esSearchTitle', {
    defaultMessage: 'Documents',
  });
  static description = i18n.translate('xpack.maps.source.esSearchDescription', {
    defaultMessage: 'Vector data from a Kibana index pattern',
  });

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSourceConfigChange = sourceConfig => {
      if (!sourceConfig) {
        onPreviewSource(null);
        return;
      }

      const source = new ESSearchSource(
        {
          id: uuid(),
          ...sourceConfig,
        },
        inspectorAdapters
      );
      onPreviewSource(source);
    };
    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  }

  constructor(descriptor, inspectorAdapters) {
    super(
      {
        id: descriptor.id,
        type: ESSearchSource.type,
        indexPatternId: descriptor.indexPatternId,
        geoField: descriptor.geoField,
        filterByMapBounds: _.get(descriptor, 'filterByMapBounds', DEFAULT_FILTER_BY_MAP_BOUNDS),
        tooltipProperties: _.get(descriptor, 'tooltipProperties', []),
        sortField: _.get(descriptor, 'sortField', ''),
        sortOrder: _.get(descriptor, 'sortOrder', SORT_ORDER.DESC),
        useTopHits: _.get(descriptor, 'useTopHits', false),
        topHitsSplitField: descriptor.topHitsSplitField,
        topHitsSize: _.get(descriptor, 'topHitsSize', 1),
      },
      inspectorAdapters
    );
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        indexPatternId={this._descriptor.indexPatternId}
        onChange={onChange}
        filterByMapBounds={this._descriptor.filterByMapBounds}
        tooltipProperties={this._descriptor.tooltipProperties}
        sortField={this._descriptor.sortField}
        sortOrder={this._descriptor.sortOrder}
        useTopHits={this._descriptor.useTopHits}
        topHitsSplitField={this._descriptor.topHitsSplitField}
        topHitsSize={this._descriptor.topHitsSize}
      />
    );
  }

  async getNumberFields() {
    try {
      const indexPattern = await this._getIndexPattern();
      return indexPattern.fields.getByType('number').map(field => {
        return { name: field.name, label: field.name };
      });
    } catch (error) {
      return [];
    }
  }

  async getDateFields() {
    try {
      const indexPattern = await this._getIndexPattern();
      return indexPattern.fields.getByType('date').map(field => {
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
        value: ESSearchSource.title,
      },
      {
        label: i18n.translate('xpack.maps.source.esSearch.indexPatternLabel', {
          defaultMessage: `Index pattern`,
        }),
        value: indexPatternTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.esSearch.geoFieldLabel', {
          defaultMessage: 'Geospatial field',
        }),
        value: this._descriptor.geoField,
      },
      {
        label: i18n.translate('xpack.maps.source.esSearch.geoFieldTypeLabel', {
          defaultMessage: 'Geospatial field type',
        }),
        value: geoFieldType,
      },
    ];
  }

  // Returns sort content for an Elasticsearch search body
  _buildEsSort() {
    const { sortField, sortOrder } = this._descriptor;
    return [
      {
        [sortField]: {
          order: sortOrder,
        },
      },
    ];
  }

  async _excludeDateFields(fieldNames) {
    const dateFieldNames = _.map(await this.getDateFields(), 'name');
    return fieldNames.filter(field => {
      return !dateFieldNames.includes(field);
    });
  }

  // Returns docvalue_fields array for the union of indexPattern's dateFields and request's field names.
  async _getDateDocvalueFields(searchFields) {
    const dateFieldNames = _.map(await this.getDateFields(), 'name');
    return searchFields
      .filter(fieldName => {
        return dateFieldNames.includes(fieldName);
      })
      .map(fieldName => {
        return {
          field: fieldName,
          format: 'epoch_millis',
        };
      });
  }

  async _getTopHits(layerName, searchFilters, registerCancelCallback) {
    const { topHitsSplitField, topHitsSize } = this._descriptor;

    const indexPattern = await this._getIndexPattern();
    const geoField = await this._getGeoField();

    const scriptFields = {};
    searchFilters.fieldNames.forEach(fieldName => {
      const field = indexPattern.fields.getByName(fieldName);
      if (field && field.scripted) {
        scriptFields[field.name] = {
          script: {
            source: field.script,
            lang: field.lang,
          },
        };
      }
    });

    const topHits = {
      size: topHitsSize,
      script_fields: scriptFields,
      docvalue_fields: await this._getDateDocvalueFields(searchFilters.fieldNames),
    };
    const nonDateFieldNames = await this._excludeDateFields(searchFilters.fieldNames);

    if (this._hasSort()) {
      topHits.sort = this._buildEsSort();
    }
    if (geoField.type === ES_GEO_FIELD_TYPE.GEO_POINT) {
      topHits._source = false;
      topHits.docvalue_fields.push(...nonDateFieldNames);
    } else {
      topHits._source = {
        includes: nonDateFieldNames,
      };
    }

    const searchSource = await this._makeSearchSource(searchFilters, 0);
    searchSource.setField('aggs', {
      entitySplit: {
        terms: {
          field: topHitsSplitField,
          size: ES_SIZE_LIMIT,
        },
        aggs: {
          entityHits: {
            top_hits: topHits,
          },
        },
      },
    });

    const resp = await this._runEsQuery(
      layerName,
      searchSource,
      registerCancelCallback,
      'Elasticsearch document top hits request'
    );

    let hasTrimmedResults = false;
    const allHits = [];
    const entityBuckets = _.get(resp, 'aggregations.entitySplit.buckets', []);
    entityBuckets.forEach(entityBucket => {
      const total = _.get(entityBucket, 'entityHits.hits.total', 0);
      const hits = _.get(entityBucket, 'entityHits.hits.hits', []);
      // Reverse hits list so top documents by sort are drawn on top
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
      },
    };
  }

  // searchFilters.fieldNames contains geo field and any fields needed for styling features
  // Performs Elasticsearch search request being careful to pull back only required fields to minimize response size
  async _getSearchHits(layerName, searchFilters, registerCancelCallback) {
    const initialSearchContext = {
      docvalue_fields: await this._getDateDocvalueFields(searchFilters.fieldNames),
    };
    const geoField = await this._getGeoField();

    let searchSource;
    if (geoField.type === ES_GEO_FIELD_TYPE.GEO_POINT) {
      // Request geo_point and style fields in docvalue_fields insted of _source
      // 1) Returns geo_point in a consistent format regardless of how geo_point is stored in source
      // 2) Setting _source to false so we avoid pulling back unneeded fields.
      initialSearchContext.docvalue_fields.push(
        ...(await this._excludeDateFields(searchFilters.fieldNames))
      );
      searchSource = await this._makeSearchSource(
        searchFilters,
        ES_SIZE_LIMIT,
        initialSearchContext
      );
      searchSource.setField('source', false); // do not need anything from _source
      searchSource.setField('fields', searchFilters.fieldNames); // Setting "fields" filters out unused scripted fields
    } else {
      // geo_shape fields do not support docvalue_fields yet, so still have to be pulled from _source
      searchSource = await this._makeSearchSource(
        searchFilters,
        ES_SIZE_LIMIT,
        initialSearchContext
      );
      // Setting "fields" instead of "source: { includes: []}"
      // because SearchSource automatically adds the following by default
      // 1) all scripted fields
      // 2) docvalue_fields value is added for each date field in an index - see getComputedFields
      // By setting "fields", SearchSource removes all of defaults
      searchSource.setField('fields', searchFilters.fieldNames);
    }

    if (this._hasSort()) {
      searchSource.setField('sort', this._buildEsSort());
    }

    const resp = await this._runEsQuery(
      layerName,
      searchSource,
      registerCancelCallback,
      'Elasticsearch document request'
    );

    return {
      hits: resp.hits.hits.reverse(), // Reverse hits so top documents by sort are drawn on top
      meta: {
        areResultsTrimmed: resp.hits.total > resp.hits.hits.length,
      },
    };
  }

  _isTopHits() {
    const { useTopHits, topHitsSplitField } = this._descriptor;
    return !!(useTopHits && topHitsSplitField);
  }

  _hasSort() {
    const { sortField, sortOrder } = this._descriptor;
    return !!sortField && !!sortOrder;
  }

  async getGeoJsonWithMeta(layerName, searchFilters, registerCancelCallback) {
    const { hits, meta } = this._isTopHits()
      ? await this._getTopHits(layerName, searchFilters, registerCancelCallback)
      : await this._getSearchHits(layerName, searchFilters, registerCancelCallback);

    const indexPattern = await this._getIndexPattern();
    const unusedMetaFields = indexPattern.metaFields.filter(metaField => {
      return !['_id', '_index'].includes(metaField);
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
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSearch.convertToGeoJsonErrorMsg', {
          defaultMessage:
            'Unable to convert search response to geoJson feature collection, error: {errorMsg}',
          values: { errorMsg: error.message },
        })
      );
    }

    return {
      data: featureCollection,
      meta,
    };
  }

  canFormatFeatureProperties() {
    return this._descriptor.tooltipProperties.length > 0;
  }

  async _loadTooltipProperties(docId, index, indexPattern) {
    if (this._descriptor.tooltipProperties.length === 0) {
      return {};
    }

    const searchSource = new SearchSource();
    searchSource.setField('index', indexPattern);
    searchSource.setField('size', 1);
    const query = {
      language: 'kuery',
      query: `_id:"${docId}" and _index:"${index}"`,
    };
    searchSource.setField('query', query);
    searchSource.setField('fields', this._descriptor.tooltipProperties);

    const resp = await searchSource.fetch();

    const hit = _.get(resp, 'hits.hits[0]');
    if (!hit) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSearch.loadTooltipPropertiesErrorMsg', {
          defaultMessage: 'Unable to find document, _id: {docId}',
          values: { docId },
        })
      );
    }

    const properties = indexPattern.flattenHit(hit);
    indexPattern.metaFields.forEach(metaField => {
      if (!this._descriptor.tooltipProperties.includes(metaField)) {
        delete properties[metaField];
      }
    });
    return properties;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    const indexPattern = await this._getIndexPattern();
    const propertyValues = await this._loadTooltipProperties(
      properties._id,
      properties._index,
      indexPattern
    );

    return this._descriptor.tooltipProperties.map(propertyName => {
      return new ESTooltipProperty(
        propertyName,
        propertyName,
        propertyValues[propertyName],
        indexPattern
      );
    });
  }

  isFilterByMapBounds() {
    return _.get(this._descriptor, 'filterByMapBounds', false);
  }

  async getLeftJoinFields() {
    const indexPattern = await this._getIndexPattern();
    // Left fields are retrieved from _source.
    return getSourceFields(indexPattern.fields).map(field => {
      return { name: field.name, label: field.name };
    });
  }

  async getSupportedShapeTypes() {
    let geoFieldType;
    try {
      const geoField = await this._getGeoField();
      geoFieldType = geoField.type;
    } catch (error) {
      // ignore exeception
    }

    if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
      return [VECTOR_SHAPE_TYPES.POINT];
    }

    return [VECTOR_SHAPE_TYPES.POINT, VECTOR_SHAPE_TYPES.LINE, VECTOR_SHAPE_TYPES.POLYGON];
  }

  getSourceTooltipContent(sourceDataRequest) {
    const featureCollection = sourceDataRequest ? sourceDataRequest.getData() : null;
    const meta = sourceDataRequest ? sourceDataRequest.getMeta() : null;
    if (!featureCollection || !meta) {
      // no tooltip content needed when there is no feature collection or meta
      return {
        tooltipContent: null,
        areResultsTrimmed: false,
      };
    }

    if (this._isTopHits()) {
      const entitiesFoundMsg = i18n.translate('xpack.maps.esSearch.topHitsEntitiesCountMsg', {
        defaultMessage: `Found {entityCount} entities.`,
        values: { entityCount: meta.entityCount },
      });
      if (meta.areResultsTrimmed) {
        const trimmedMsg = i18n.translate('xpack.maps.esSearch.topHitsResultsTrimmedMsg', {
          defaultMessage: `Results limited to most recent {topHitsSize} documents per entity.`,
          values: { topHitsSize: this._descriptor.topHitsSize },
        });
        return {
          tooltipContent: `${entitiesFoundMsg} ${trimmedMsg}`,
          areResultsTrimmed: false,
        };
      }

      return {
        tooltipContent: entitiesFoundMsg,
        areResultsTrimmed: false,
      };
    }

    if (meta.areResultsTrimmed) {
      return {
        tooltipContent: i18n.translate('xpack.maps.esSearch.resultsTrimmedMsg', {
          defaultMessage: `Results limited to first {count} documents.`,
          values: { count: featureCollection.features.length },
        }),
        areResultsTrimmed: true,
      };
    }

    return {
      tooltipContent: i18n.translate('xpack.maps.esSearch.featureCountMsg', {
        defaultMessage: `Found {count} documents.`,
        values: { count: featureCollection.features.length },
      }),
      areResultsTrimmed: false,
    };
  }

  getSyncMeta() {
    return {
      sortField: this._descriptor.sortField,
      sortOrder: this._descriptor.sortOrder,
      useTopHits: this._descriptor.useTopHits,
      topHitsSplitField: this._descriptor.topHitsSplitField,
      topHitsSize: this._descriptor.topHitsSize,
    };
  }

  async getPreIndexedShape(properties) {
    const geoField = await this._getGeoField();

    return {
      index: properties._index, // Can not use index pattern title because it may reference many indices
      id: properties._id,
      path: geoField.name,
    };
  }

  _getRawFieldName(fieldName) {
    // fieldName is rawFieldName for documents source since the source uses raw documents instead of aggregated metrics
    return fieldName;
  }
}
