/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { i18n } from '@kbn/i18n';
import { DEFAULT_MAX_BUCKETS_LIMIT, FIELD_ORIGIN, AGG_TYPE } from '../../../common/constants';
import { ESDocField } from '../fields/es_doc_field';
import { AbstractESAggSource, AGG_DELIMITER } from './es_agg_source';
import { getField, addFieldToDSL, extractPropertiesFromBucket } from '../util/es_agg_utils';

const TERMS_AGG_NAME = 'join';

const FIELD_NAME_PREFIX = '__kbnjoin__';
const GROUP_BY_DELIMITER = '_groupby_';
const TERMS_BUCKET_KEYS_TO_IGNORE = ['key', 'doc_count'];

export function extractPropertiesMap(rawEsData, countPropertyName) {
  const propertiesMap = new Map();
  _.get(rawEsData, ['aggregations', TERMS_AGG_NAME, 'buckets'], []).forEach(termBucket => {
    const properties = extractPropertiesFromBucket(termBucket, TERMS_BUCKET_KEYS_TO_IGNORE);
    if (countPropertyName) {
      properties[countPropertyName] = termBucket.doc_count;
    }
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

  getAggKey(aggType, fieldName) {
    const metricKey =
      aggType !== AGG_TYPE.COUNT ? `${aggType}${AGG_DELIMITER}${fieldName}` : aggType;
    return `${FIELD_NAME_PREFIX}${metricKey}${GROUP_BY_DELIMITER}${
      this._descriptor.indexPatternTitle
    }.${this._termField.getName()}`;
  }

  getAggLabel(aggType, fieldName) {
    return aggType === AGG_TYPE.COUNT
      ? i18n.translate('xpack.maps.source.esJoin.countLabel', {
          defaultMessage: `Count of {indexPatternTitle}`,
          values: { indexPatternTitle: this._descriptor.indexPatternTitle },
        })
      : super.getAggLabel(aggType, fieldName);
  }

  async getPropertiesMap(searchFilters, leftSourceName, leftFieldName, registerCancelCallback) {
    if (!this.hasCompleteConfig()) {
      return [];
    }

    const indexPattern = await this.getIndexPattern();
    const searchSource = await this._makeSearchSource(searchFilters, 0);
    const termsField = getField(indexPattern, this._termField.getName());
    const termsAgg = { size: DEFAULT_MAX_BUCKETS_LIMIT };
    searchSource.setField('aggs', {
      [TERMS_AGG_NAME]: {
        terms: addFieldToDSL(termsAgg, termsField),
        aggs: { ...this.getValueAggsDsl(indexPattern) },
      },
    });

    const rawEsData = await this._runEsQuery({
      requestId: this.getId(),
      requestName: `${this._descriptor.indexPatternTitle}.${this._termField.getName()}`,
      searchSource,
      registerCancelCallback,
      requestDescription: this._getRequestDescription(leftSourceName, leftFieldName),
    });

    const countPropertyName = this.getAggKey(AGG_TYPE.COUNT);
    return {
      propertiesMap: extractPropertiesMap(rawEsData, countPropertyName),
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
