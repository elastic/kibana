/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions, HttpHandler } from '@kbn/core/public';
import type {
  ClientRequestParamsOf,
  ReturnOf,
  RouteRepositoryClient,
} from '@kbn/server-route-repository';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { NightshiftSourcesRouteRepository } from '../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: unknown;
};

export type NightshiftSourcesRepositoryClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type NightshiftSourcesRepositoryClient = RouteRepositoryClient<
  NightshiftSourcesRouteRepository,
  NightshiftSourcesRepositoryClientOptions
>;

export type NightshiftSourcesRepositoryEndpoint = keyof NightshiftSourcesRouteRepository;

export type NightshiftSourcesAPIReturnType<TEndpoint extends NightshiftSourcesRepositoryEndpoint> =
  ReturnOf<NightshiftSourcesRouteRepository, TEndpoint>;

export type NightshiftSourcesAPIClientRequestParamsOf<
  TEndpoint extends NightshiftSourcesRepositoryEndpoint
> = ClientRequestParamsOf<NightshiftSourcesRouteRepository, TEndpoint>;

export function createNightshiftSourcesRepositoryClient(core: {
  http: { fetch: HttpHandler };
}): NightshiftSourcesRepositoryClient {
  return createRepositoryClient(core);
}
