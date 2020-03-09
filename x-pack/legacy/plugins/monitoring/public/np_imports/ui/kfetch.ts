/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from '../legacy_imports';
import { HttpRequestInit } from '../../../../../../../src/core/public/http/types'; // eslint-disable-line @kbn/eslint/no-restricted-paths

export interface KFetchQuery {
  [key: string]: string | number | boolean | undefined;
}

export interface KFetchOptions extends HttpRequestInit {
  pathname: string;
  query?: KFetchQuery;
  asSystemRequest?: boolean;
}

export interface KFetchKibanaOptions {
  prependBasePath?: boolean;
}

export const kfetch = async (
  { pathname, ...options }: KFetchOptions,
  kfetchOptions?: KFetchKibanaOptions
) =>
  await npStart.core.http.fetch(pathname, {
    prependBasePath: kfetchOptions?.prependBasePath,
    ...options,
  });
