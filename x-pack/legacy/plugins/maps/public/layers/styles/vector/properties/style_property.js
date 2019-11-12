/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */





export class AbstractStyleProperty {

  constructor(options, styleName) {
    this._options = options;
    this._styleName = styleName;
  }

  isDynamic() {
    return false;
  }

  getStyleName() {
    return this._styleName;
  }
  getOptions() {
    return this._options || {};
  }

  renderHeader() {
    return null;
  }
}
