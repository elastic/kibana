/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export class AbstractField {

  constructor({ fieldName, source }) {
    this._fieldName = fieldName;
    this._source = source;
  }

  getName() {
    return this._fieldName;
  }

  async getLabel() {
    return this._fieldName;
  }

  async isIdField() {
    //todo
  }

  async isDisplayField() {
    //todo
  }

  createTooltipProperty() {
    throw new Error('must implement Field#createTooltipProperty');
  }

  getSource() {
    return this._source;
  }

  isOrdinal() {
    return false;
  }

  isDate() {
    return false;
  }

}









