/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let _httpClient: any;
let _prependBasePath: any;

export function init(httpClient: any, prependBasePath: any): void {
  _httpClient = httpClient;
  _prependBasePath = prependBasePath;
}

function getFullPath(path: string): string {
  const apiPrefix = _prependBasePath('/api/index_lifecycle_management');

  if (path) {
    return `${apiPrefix}/${path}`;
  }

  return apiPrefix;
}

// The extend_index_management module requires that we support an injected httpClient here.

export function sendPost(path: string, payload: any, httpClient = _httpClient): any {
  return httpClient.post(getFullPath(path), payload);
}

export function sendGet(path: string, httpClient = _httpClient): any {
  return httpClient.get(getFullPath(path));
}

export function sendPut(path: string, payload: any, httpClient = _httpClient): any {
  return httpClient.put(getFullPath(path), payload);
}

export function sendDelete(path: string, httpClient = _httpClient): any {
  return httpClient.delete(getFullPath(path));
}
