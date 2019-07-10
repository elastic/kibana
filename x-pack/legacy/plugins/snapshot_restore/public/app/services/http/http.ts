/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export let httpClient: any;
let _prependBasePath: any;

export function init(httpClientObj: any, chrome: any): void {
  httpClient = httpClientObj;
  _prependBasePath = chrome.addBasePath.bind(chrome);
}

export function addBasePath(path: string): string {
  return _prependBasePath(path);
}
