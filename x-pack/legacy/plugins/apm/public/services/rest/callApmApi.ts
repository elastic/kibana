/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { callApi } from './callApi';
import { APMAPI } from '../../../server/routes/create_apm_api';
import { Client } from '../../../server/routes/typings';

export const callApmApi: Client<APMAPI['_S']> = (options => {
  const { pathname, params = {}, ...opts } = options;

  const path = (params.path || {}) as Record<string, any>;
  const body = params.body ? { body: JSON.stringify(params.body) } : undefined;
  const query = params.query ? { query: params.query } : undefined;

  const formattedPathname = Object.keys(path).reduce((acc, paramName) => {
    return acc.replace(`{${paramName}}`, path[paramName]);
  }, pathname);

  return callApi({
    ...opts,
    pathname: formattedPathname,
    ...body,
    ...query
  }) as any;
}) as Client<APMAPI['_S']>;
