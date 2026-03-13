/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type {
  ClientRequestParamsOf,
  ReturnOf,
  RouteRepositoryClient,
} from '@kbn/server-route-repository';
import { formatRequest } from '@kbn/server-route-repository-utils';
import type { FetchOptions } from '..';
import type { APIEndpoint, DatasetQualityServerRouteRepository } from '../../server/routes';
import type { CallApi } from './call_api';
import { callApi } from './call_api';

export type DatasetQualityClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type DatasetQualityClient = RouteRepositoryClient<
  DatasetQualityServerRouteRepository,
  DatasetQualityClientOptions
>['fetch'];

export type AutoAbortedClient = RouteRepositoryClient<
  DatasetQualityServerRouteRepository,
  Omit<DatasetQualityClientOptions, 'signal'>
>['fetch'];

export type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<
  DatasetQualityServerRouteRepository,
  TEndpoint
>;

export type APIClientRequestParamsOf<TEndpoint extends APIEndpoint> = ClientRequestParamsOf<
  DatasetQualityServerRouteRepository,
  TEndpoint
>;

export let callDatasetQualityApi: DatasetQualityClient = () => {
  throw new Error(
    'callDatasetQualityApi has to be initialized before used. Call createCallApi first.'
  );
};

export function createCallDatasetQualityApi(core: CoreStart | CoreSetup) {
  callDatasetQualityApi = ((endpoint, options) => {
    const { params } = options as unknown as {
      params?: Partial<Record<string, string | number | boolean | undefined>>;
    };

    const pathParams =
      params?.path != null && typeof params.path === 'object' && !Array.isArray(params.path)
        ? (params.path as Record<string, unknown>)
        : undefined;
    const { method, pathname } = formatRequest(endpoint, pathParams ?? {});

    const body =
      params?.body != null && typeof params.body === 'object' && !Array.isArray(params.body)
        ? (params.body as Record<string, unknown>)
        : undefined;

    const query =
      params?.query != null && typeof params.query === 'object' && !Array.isArray(params.query)
        ? (params.query as Record<string, unknown>)
        : undefined;

    return callApi(core, {
      ...options,
      method,
      pathname,
      body,
      query,
    } as unknown as Parameters<CallApi>[1]);
  }) as DatasetQualityClient;
}
