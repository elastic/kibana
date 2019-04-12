/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ESTooltipProperty } from './es_tooltip_property';

export class ESAggMetricTooltipProperty extends ESTooltipProperty {

  constructor(propertyName, rawValue, indexPattern, metricField) {
    super(propertyName, rawValue, indexPattern);
    this._metricField = metricField;
  }
  isFilterable() {
    return false;
  }

  getHtmlDisplayValue() {
    if (typeof this._rawValue === 'undefined') {
      return '-';
    }
    if (this._metricField.type === 'count') {
      return this._rawValue;
    }
    const indexPatternField = this._indexPattern.fields.byName[this._metricField.field];
    if (!indexPatternField) {
      return this._rawValue;
    }
    const htmlConverter = indexPatternField.format.getConverterFor('html');

    return (htmlConverter)
      ? htmlConverter(this._rawValue)
      : indexPatternField.format.convert(this._rawValue);

  }

}
