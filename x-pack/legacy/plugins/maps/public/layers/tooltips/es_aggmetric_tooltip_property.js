/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESTooltipProperty } from './es_tooltip_property';
import { METRIC_TYPE } from '../../../common/constants';

export class ESAggMetricTooltipProperty extends ESTooltipProperty {
  constructor(propertyKey, propertyName, rawValue, indexPattern, metricField) {
    super(propertyKey, propertyName, rawValue, indexPattern);
    this._metricField = metricField;
  }

  isFilterable() {
    return false;
  }

  getHtmlDisplayValue() {
    if (typeof this._rawValue === 'undefined') {
      return '-';
    }
    if (
      this._metricField.getAggType() === METRIC_TYPE.COUNT ||
      this._metricField.getAggType() === METRIC_TYPE.UNIQUE_COUNT
    ) {
      return this._rawValue;
    }
    const indexPatternField = this._indexPattern.fields.getByName(
      this._metricField.getESDocFieldName()
    );
    if (!indexPatternField) {
      return this._rawValue;
    }
    const htmlConverter = indexPatternField.format.getConverterFor('html');

    return htmlConverter
      ? htmlConverter(this._rawValue)
      : indexPatternField.format.convert(this._rawValue);
  }
}
