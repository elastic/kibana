/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export class TooltipProperty {
  constructor(propertyKey, propertyName, rawValue) {
    this._propertyKey = propertyKey;
    this._propertyName = propertyName;
    this._rawValue = rawValue;
  }

  getPropertyKey() {
    return this._propertyKey;
  }

  getPropertyName() {
    return this._propertyName;
  }

  getHtmlDisplayValue() {
    return _.escape(this._rawValue);
  }

  getRawValue() {
    return this._rawValue;
  }

  isFilterable() {
    return false;
  }

  async getESFilters() {
    return [];
  }
}
