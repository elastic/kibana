/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';

let _http: HttpStart | null = null;

export function setHttp(http: HttpStart) {
  _http = http;
}

export function getHttp() {
  if (!_http) {
    throw new Error('Rollup http is not defined');
  }
  return _http;
}
