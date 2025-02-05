/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup, HttpResponse } from '@kbn/core/public';
import { API_BASE_PATH } from '../../../common/constants';
import { Cluster } from '../../../common/lib';

let _httpClient: HttpSetup;

export interface SendGetOptions {
  asSystemRequest?: boolean;
}

export function init(httpClient: HttpSetup): void {
  _httpClient = httpClient;
}

export function getFullPath(path?: string): string {
  if (path) {
    return `${API_BASE_PATH}/${path}`;
  }

  return API_BASE_PATH;
}

export function sendPost(path: string, payload: Cluster): Promise<HttpResponse> {
  return _httpClient.post(getFullPath(path), {
    body: JSON.stringify(payload),
  });
}

export function sendGet(
  path?: string,
  { asSystemRequest }: SendGetOptions = {}
): Promise<HttpResponse> {
  return _httpClient.get(getFullPath(path), { asSystemRequest });
}

export function sendPut(path: string, payload: Omit<Cluster, 'name'>): Promise<HttpResponse> {
  return _httpClient.put(getFullPath(path), {
    body: JSON.stringify(payload),
  });
}

export function sendDelete(path: string): Promise<HttpResponse> {
  return _httpClient.delete(getFullPath(path));
}
