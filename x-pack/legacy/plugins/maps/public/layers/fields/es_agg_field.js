/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractField } from './field';


export class ESAggMetricField extends AbstractField {

  static type = 'ES_AGG';

  constructor({ label, source, aggType, esDocField }) {
    super({ source });
    this._label = label;
    this._aggType = aggType;
    this._esDocField = esDocField;
  }

  getName() {
    return this._source.formatMetricKey(this.getAggType(), this.getESDocFieldName());
  }

  async getLabel() {
    return this.getPropertyLabel();
  }

  getAggType() {
    return this._aggType;
  }

  getESDocField() {
    return this._esDocField;
  }

  getPropertyLabel() {
    return this._label ? this._label : this._source.formatMetricLabel(this.getAggType(), this.getESDocFieldName());
  }

  getESDocFieldName() {
    return this._esDocField ? this._esDocField.getName() : '';
  }

  getRequestDescription() {
    return this.getAggType() !== 'count' ? `${this.getAggType()} ${this.getESDocFieldName()}` : 'count';
  }

  makeMetricAggConfig() {
    const metricAggConfig = {
      id: this.getName(),
      enabled: true,
      type: this.getAggType(),
      schema: 'metric',
      params: {}
    };
    if (this.getAggType() !== 'count') {
      metricAggConfig.params = { field: this.getESDocFieldName() };
    }
    return metricAggConfig;
  }

}
