/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, HttpFetchOptions } from '@kbn/core/public';
import type { ICPSManager } from '@kbn/cps-utils';
import { type RouteRepositoryClient } from '@kbn/server-route-repository';
import type { EndpointOf, ReturnOf } from '@kbn/server-route-repository-utils';
import { formatRequest } from '@kbn/server-route-repository-utils';
import type { CallApi } from './call_api';
import { callApi } from './call_api';
import type { SharedAPMRouteRepository } from './routes';

export type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  pathname: string;
  isCachable?: boolean;
  method?: string;
  body?: any;
};

type APMClientOptions = Omit<FetchOptions, 'query' | 'body' | 'pathname' | 'signal'> & {
  signal: AbortSignal | null;
};

export type APMClientV2 = RouteRepositoryClient<
  SharedAPMRouteRepository,
  APMClientOptions
>['fetch'];

export type AutoAbortedAPMClientV2 = RouteRepositoryClient<
  SharedAPMRouteRepository,
  Omit<APMClientOptions, 'signal'>
>['fetch'];

type APIEndpoint = EndpointOf<SharedAPMRouteRepository>;

export type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<
  SharedAPMRouteRepository,
  TEndpoint
>;

interface Dependencies {
  cpsManager?: ICPSManager;
}

export function createCallApmApiV2(core: CoreStart, { cpsManager }: Dependencies): APMClientV2 {
  return ((endpoint, options) => {
    const { params } = options as unknown as {
      params?: Partial<Record<string, any>>;
    };

    const { method, pathname, version } = formatRequest(endpoint, params?.path);
    const projectRouting = cpsManager?.getProjectRouting();

    return callApi(core, {
      ...options,
      method,
      pathname,
      body: params?.body,
      query: params?.query,
      version,
      headers: {
        ...(options as any)?.headers,
        ...(projectRouting ? { 'x-project-routing': projectRouting } : {}),
      },
    } as unknown as Parameters<CallApi>[1]);
  }) as APMClientV2;
}
