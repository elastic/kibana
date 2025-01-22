/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * IMPORTANT: Please see how {@link BreadcrumbService} is set up for an example of how these services should be set up
 * in future. The pattern in this file is legacy and should be updated to conform to the plugin lifecycle.
 */

import { HttpSetup } from '@kbn/core/public';
import { UseRequestConfig, useRequest as _useRequest } from '@kbn/es-ui-shared-plugin/public';

interface GenericObject {
  [key: string]: any;
}

let _httpClient: HttpSetup;

export function init(httpClient: HttpSetup): void {
  _httpClient = httpClient;
}

function getFullPath(path: string): string {
  const apiPrefix = '/api/index_lifecycle_management';

  if (path) {
    return `${apiPrefix}/${path}`;
  }

  return apiPrefix;
}

export function sendPost(path: string, payload: GenericObject, query?: GenericObject) {
  return _httpClient.post(getFullPath(path), { body: JSON.stringify(payload), query });
}

export function sendGet(path: string, query?: GenericObject): any {
  return _httpClient.get(getFullPath(path), { query });
}

export function sendDelete(path: string) {
  return _httpClient.delete(getFullPath(path));
}

export const useRequest = <T = any, E = { statusCode: number; error: string; message: string }>(
  config: UseRequestConfig
) => {
  return _useRequest<T, E>(_httpClient, { ...config, path: getFullPath(config.path) });
};
