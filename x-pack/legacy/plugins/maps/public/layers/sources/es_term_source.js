/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { Schemas } from 'ui/vis/editors/default/schemas';
import { AggConfigs } from 'ui/agg_types';
import { i18n } from '@kbn/i18n';
import { DEFAULT_MAX_BUCKETS_LIMIT, FIELD_ORIGIN, METRIC_TYPE } from '../../../common/constants';
import { ESDocField } from '../fields/es_doc_field';
import { AbstractESAggSource } from './es_agg_source';

const TERMS_AGG_NAME = 'join';

const FIELD_NAME_PREFIX = '__kbnjoin__';
const GROUP_BY_DELIMITER = '_groupby_';

const aggSchemas = new Schemas([
  AbstractESAggSource.METRIC_SCHEMA_CONFIG,
  {
    group: 'buckets',
    name: 'segment',
    title: 'Terms',
    aggFilter: 'terms',
    min: 1,
    max: 1,
  },
]);

export function extractPropertiesMap(rawEsData, propertyNames, countPropertyName) {
  const propertiesMap = new Map();
  _.get(rawEsData, ['aggregations', TERMS_AGG_NAME, 'buckets'], []).forEach(termBucket => {
    const properties = {};
    if (countPropertyName) {
      properties[countPropertyName] = termBucket.doc_count;
    }
    propertyNames.forEach(propertyName => {
      if (_.has(termBucket, [propertyName, 'value'])) {
        properties[propertyName] = _.get(termBucket, [propertyName, 'value']);
      }
    });
    propertiesMap.set(termBucket.key.toString(), properties);
  });
  return propertiesMap;
}

export class ESTermSource extends AbstractESAggSource {
  static type = 'ES_TERM_SOURCE';

  constructor(descriptor, inspectorAdapters) {
    super(descriptor, inspectorAdapters);
    this._termField = new ESDocField({
      fieldName: descriptor.term,
      source: this,
      origin: this.getOriginForField(),
    });
  }

  static renderEditor({}) {
    //no need to localize. this editor is never rendered.
    return `<div>editor details</div>`;
  }

  hasCompleteConfig() {
    return _.has(this._descriptor, 'indexPatternId') && _.has(this._descriptor, 'term');
  }

  getIndexPatternIds() {
    return [this._descriptor.indexPatternId];
  }

  getTermField() {
    return this._termField;
  }

  getOriginForField() {
    return FIELD_ORIGIN.JOIN;
  }

  getWhereQuery() {
    return this._descriptor.whereQuery;
  }

  formatMetricKey(aggType, fieldName) {
    const metricKey = aggType !== METRIC_TYPE.COUNT ? `${aggType}_of_${fieldName}` : aggType;
    return `${FIELD_NAME_PREFIX}${metricKey}${GROUP_BY_DELIMITER}${
      this._descriptor.indexPatternTitle
    }.${this._termField.getName()}`;
  }

  formatMetricLabel(type, fieldName) {
    const metricLabel = type !== METRIC_TYPE.COUNT ? `${type} ${fieldName}` : 'count';
    return `${metricLabel} of ${this._descriptor.indexPatternTitle}:${this._termField.getName()}`;
  }

  async getPropertiesMap(searchFilters, leftSourceName, leftFieldName, registerCancelCallback) {
    if (!this.hasCompleteConfig()) {
      return [];
    }

    const indexPattern = await this.getIndexPattern();
    const searchSource = await this._makeSearchSource(searchFilters, 0);
    const configStates = this._makeAggConfigs();
    const aggConfigs = new AggConfigs(indexPattern, configStates, aggSchemas.all);
    searchSource.setField('aggs', aggConfigs.toDsl());

    const rawEsData = await this._runEsQuery({
      requestId: this.getId(),
      requestName: `${this._descriptor.indexPatternTitle}.${this._termField.getName()}`,
      searchSource,
      registerCancelCallback,
      requestDescription: this._getRequestDescription(leftSourceName, leftFieldName),
    });

    const metricPropertyNames = configStates
      .filter(configState => {
        return configState.schema === 'metric' && configState.type !== METRIC_TYPE.COUNT;
      })
      .map(configState => {
        return configState.id;
      });
    const countConfigState = configStates.find(configState => {
      return configState.type === METRIC_TYPE.COUNT;
    });
    const countPropertyName = _.get(countConfigState, 'id');
    return {
      propertiesMap: extractPropertiesMap(rawEsData, metricPropertyNames, countPropertyName),
    };
  }

  isFilterByMapBounds() {
    return false;
  }

  _getRequestDescription(leftSourceName, leftFieldName) {
    const metrics = this.getMetricFields().map(esAggMetric => esAggMetric.getRequestDescription());
    const joinStatement = [];
    joinStatement.push(
      i18n.translate('xpack.maps.source.esJoin.joinLeftDescription', {
        defaultMessage: `Join {leftSourceName}:{leftFieldName} with`,
        values: { leftSourceName, leftFieldName },
      })
    );
    joinStatement.push(`${this._descriptor.indexPatternTitle}:${this._termField.getName()}`);
    joinStatement.push(
      i18n.translate('xpack.maps.source.esJoin.joinMetricsDescription', {
        defaultMessage: `for metrics {metrics}`,
        values: { metrics: metrics.join(',') },
      })
    );
    return i18n.translate('xpack.maps.source.esJoin.joinDescription', {
      defaultMessage: `Elasticsearch terms aggregation request for {description}`,
      values: {
        description: joinStatement.join(' '),
      },
    });
  }

  _makeAggConfigs() {
    const metricAggConfigs = this.createMetricAggConfigs();
    return [
      ...metricAggConfigs,
      {
        id: TERMS_AGG_NAME,
        enabled: true,
        type: 'terms',
        schema: 'segment',
        params: {
          field: this._termField.getName(),
          size: DEFAULT_MAX_BUCKETS_LIMIT,
        },
      },
    ];
  }

  async getDisplayName() {
    //no need to localize. this is never rendered.
    return `es_table ${this._descriptor.indexPatternId}`;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    return await this.filterAndFormatPropertiesToHtmlForMetricFields(properties);
  }

  getFieldNames() {
    return this.getMetricFields().map(esAggMetricField => esAggMetricField.getName());
  }
}
