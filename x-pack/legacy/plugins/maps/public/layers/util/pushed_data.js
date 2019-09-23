/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export class PushedData {

  constructor(data) {
    this._descriptor = { data };
  }

  getData() {
    return this._descriptor.data;
  }

  hasData() {
    return !!this._descriptor.data;
  }

}

