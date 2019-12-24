/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup } from 'kibana/public';
import { callApi, FetchOptions } from './callApi';
import { APMAPI } from '../../../server/routes/create_apm_api';
import { Client } from '../../../server/routes/typings';

export type APMClient = Client<APMAPI['_S']>;
export type APMClientOptions = Omit<FetchOptions, 'query' | 'body'> & {
  params?: {
    body?: any;
    query?: any;
    path?: any;
  };
};

export const createCallApmApi = (http: HttpSetup) =>
  ((options: APMClientOptions) => {
    const { pathname, params = {}, ...opts } = options;

    const path = (params.path || {}) as Record<string, any>;

    const formattedPathname = Object.keys(path).reduce((acc, paramName) => {
      return acc.replace(`{${paramName}}`, path[paramName]);
    }, pathname);

    return callApi(http, {
      ...opts,
      pathname: formattedPathname,
      body: params.body,
      query: params.query
    });
  }) as APMClient;
