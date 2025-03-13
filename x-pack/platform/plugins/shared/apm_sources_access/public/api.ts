/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import type { APIEndpoint, APIReturnType } from '../server';

interface ApiOptions {
  body?: unknown;
  signal?: AbortSignal;
}

export const callSourcesAPI = <T extends APIEndpoint>(
  http: HttpStart,
  pathname: T,
  { body, signal }: ApiOptions
): Promise<APIReturnType<T>> => {
  const [method, path] = pathname.split(' ');

  return http[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch'](path, {
    body: body != null ? JSON.stringify(body) : undefined,
    signal,
  });
};
