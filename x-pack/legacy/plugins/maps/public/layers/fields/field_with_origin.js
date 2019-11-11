/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractField } from './field';

export class FieldWithOrigin extends AbstractField {

  //todo: This annotated field was introduced due to legacy constraints in the code.
  //Field-descriptors in styles use a combination of field-name and FIELD_ORIGIN-enumeration to uniquely identify a field
  //across layer-source and joins.
  constructor({ field, origin }) {
    super({});
    this._field = field;
    this._origin = origin;
  }

  getName() {
    return this._field.getName();
  }

  isValid() {
    return this._field.isValid();
  }

  async getIndexPatternType() {
    return await this._field.getIndexPatternType();
  }

  async getLabel() {
    return await this._field.getLabel();
  }

  getOrigin() {
    return this._origin;
  }

}









