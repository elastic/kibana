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

export function getFullPath(path: string): string {
  const apiPrefix = _prependBasePath('/api/remote_clusters');

  if (path) {
    return `${apiPrefix}/${path}`;
  }

  return apiPrefix;
}

export function sendPost(path: string, payload: any): any {
  return _httpClient.post(getFullPath(path), payload);
}

export function sendGet(path: string): any {
  return _httpClient.get(getFullPath(path));
}

export function sendPut(path: string, payload: any): any {
  return _httpClient.put(getFullPath(path), payload);
}

export function sendDelete(path: string): any {
  return _httpClient.delete(getFullPath(path));
}
