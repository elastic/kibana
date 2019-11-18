/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from './vector_source';
import {
  fetchSearchSourceAndRecordWithInspector,
  indexPatternService,
  SearchSource
} from '../../kibana_services';
import { createExtentFilter } from '../../elasticsearch_geo_utils';
import { timefilter } from 'ui/timefilter';
import _ from 'lodash';
import { AggConfigs } from 'ui/agg_types';
import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import { copyPersistentState } from '../../reducers/util';
import { ES_GEO_FIELD_TYPE } from '../../../common/constants';
import { DataRequestAbortError } from '../util/data_request';

export class AbstractESSource extends AbstractVectorSource {

  static icon = 'logoElasticsearch';

  constructor(descriptor, inspectorAdapters) {
    super({
      ...descriptor,
      applyGlobalQuery: _.get(descriptor, 'applyGlobalQuery', true),
    }, inspectorAdapters);
  }

  isFieldAware() {
    return true;
  }

  isRefreshTimerAware() {
    return true;
  }

  isQueryAware() {
    return true;
  }

  getIndexPatternIds() {
    return  [this._descriptor.indexPatternId];
  }

  getQueryableIndexPatternIds() {
    if (this.getApplyGlobalQuery()) {
      return  [this._descriptor.indexPatternId];
    }
    return [];
  }

  supportsElasticsearchFilters() {
    return true;
  }

  destroy() {
    this._inspectorAdapters.requests.resetRequest(this.getId());
  }

  cloneDescriptor() {
    const clonedDescriptor = copyPersistentState(this._descriptor);
    // id used as uuid to track requests in inspector
    clonedDescriptor.id = uuid();
    return clonedDescriptor;
  }

  _getRawFieldName(fieldName) {
    return fieldName;
  }


  async _runEsQuery(requestName, searchSource, registerCancelCallback, requestDescription) {
    const abortController = new AbortController();
    registerCancelCallback(() => abortController.abort());

    try {
      return await fetchSearchSourceAndRecordWithInspector({
        inspectorAdapters: this._inspectorAdapters,
        searchSource,
        requestName,
        requestId: this.getId(),
        requestDesc: requestDescription,
        abortSignal: abortController.signal,
      });
    } catch(error) {
      if (error.name === 'AbortError') {
        throw new DataRequestAbortError();
      }

      throw new Error(i18n.translate('xpack.maps.source.esSource.requestFailedErrorMessage', {
        defaultMessage: `Elasticsearch search request failed, error: {message}`,
        values: { message: error.message }
      }));
    }
  }

  async _makeSearchSource(searchFilters, limit, initialSearchContext) {
    const indexPattern = await this.getIndexPattern();
    const isTimeAware = await this.isTimeAware();
    const applyGlobalQuery = _.get(searchFilters, 'applyGlobalQuery', true);
    const globalFilters = applyGlobalQuery ? searchFilters.filters : [];
    const allFilters = [...globalFilters];
    if (this.isFilterByMapBounds() && searchFilters.buffer) {//buffer can be empty
      const geoField = await this._getGeoField();
      allFilters.push(createExtentFilter(searchFilters.buffer, geoField.name, geoField.type));
    }
    if (isTimeAware) {
      allFilters.push(timefilter.createFilter(indexPattern, searchFilters.timeFilters));
    }

    const searchSource = new SearchSource(initialSearchContext);
    searchSource.setField('index', indexPattern);
    searchSource.setField('size', limit);
    searchSource.setField('filter', allFilters);
    if (applyGlobalQuery) {
      searchSource.setField('query', searchFilters.query);
    }

    if (searchFilters.sourceQuery) {
      const layerSearchSource = new SearchSource();
      layerSearchSource.setField('index', indexPattern);
      layerSearchSource.setField('query', searchFilters.sourceQuery);
      searchSource.setParent(layerSearchSource);
    }

    return searchSource;
  }

  async getBoundsForFilters({ sourceQuery, query, timeFilters, filters, applyGlobalQuery }) {

    const searchSource = await this._makeSearchSource({ sourceQuery, query, timeFilters, filters, applyGlobalQuery }, 0);
    const geoField = await this._getGeoField();
    const indexPattern = await this.getIndexPattern();

    const geoBoundsAgg = [{
      type: 'geo_bounds',
      enabled: true,
      params: {
        field: geoField
      },
      schema: 'metric'
    }];

    const aggConfigs = new AggConfigs(indexPattern, geoBoundsAgg);
    searchSource.setField('aggs', aggConfigs.toDsl());

    let esBounds;
    try {
      const esResp = await searchSource.fetch();
      esBounds = _.get(esResp, 'aggregations.1.bounds');
    } catch(error) {
      esBounds = {
        top_left: {
          lat: 90,
          lon: -180
        },
        bottom_right: {
          lat: -90,
          lon: 180
        }
      };
    }

    return {
      min_lon: esBounds.top_left.lon,
      max_lon: esBounds.bottom_right.lon,
      min_lat: esBounds.bottom_right.lat,
      max_lat: esBounds.top_left.lat
    };
  }

  async isTimeAware() {
    try {
      const indexPattern = await this.getIndexPattern();
      const timeField = indexPattern.timeFieldName;
      return !!timeField;
    } catch (error) {
      return false;
    }
  }

  async getIndexPattern() {
    if (this.indexPattern) {
      return this.indexPattern;
    }

    try {
      this.indexPattern = await indexPatternService.get(this._descriptor.indexPatternId);
      return this.indexPattern;
    } catch (error) {
      throw new Error(i18n.translate('xpack.maps.source.esSource.noIndexPatternErrorMessage', {
        defaultMessage: `Unable to find Index pattern for id: {indexPatternId}`,
        values: { indexPatternId: this._descriptor.indexPatternId }
      }));
    }
  }

  async supportsFitToBounds() {
    try {
      const geoField = await this._getGeoField();
      // geo_bounds aggregation only supports geo_point
      // there is currently no backend support for getting bounding box of geo_shape field
      return geoField.type !== ES_GEO_FIELD_TYPE.GEO_SHAPE;
    } catch (error) {
      return false;
    }
  }


  async _getGeoField() {
    const indexPattern = await this.getIndexPattern();
    const geoField = indexPattern.fields.getByName(this._descriptor.geoField);
    if (!geoField) {
      throw new Error(i18n.translate('xpack.maps.source.esSource.noGeoFieldErrorMessage', {
        defaultMessage: `Index pattern {indexPatternTitle} no longer contains the geo field {geoField}`,
        values: { indexPatternTitle: indexPattern.title, geoField: this._descriptor.geoField }
      }));
    }
    return geoField;
  }

  async getDisplayName() {
    try {
      const indexPattern = await this.getIndexPattern();
      return indexPattern.title;
    } catch (error) {
      // Unable to load index pattern, just return id as display name
      return this._descriptor.indexPatternId;
    }
  }

  isBoundsAware() {
    return true;
  }

  getId() {
    return this._descriptor.id;
  }



  async getFieldFormatter(fieldName) {
    // fieldName could be an aggregation so it needs to be unpacked to expose raw field.
    const rawFieldName = this._getRawFieldName(fieldName);
    if (!rawFieldName) {
      return null;
    }

    let indexPattern;
    try {
      indexPattern = await this.getIndexPattern();
    } catch(error) {
      return null;
    }

    const fieldFromIndexPattern = indexPattern.fields.getByName(rawFieldName);
    if (!fieldFromIndexPattern) {
      return null;
    }

    return fieldFromIndexPattern.format.getConverterFor('text');
  }

}
