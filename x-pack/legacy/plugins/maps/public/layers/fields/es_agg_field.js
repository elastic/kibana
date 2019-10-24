/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractField } from './field';


export class ESAggMetricField extends AbstractField {

  static type = 'ES_AGG';

  constructor({ label, source, aggType, esDocField }) {
    super({});
    this._label = label;
    this._aggType = aggType;
    this._esDocField = esDocField;
    this._source = source;
  }

  async getLabel() {
    return this._label;
  }

  getAggType() {
    return this._aggType;
  }

  getESDocField() {
    return this._esDocField;
  }

}
