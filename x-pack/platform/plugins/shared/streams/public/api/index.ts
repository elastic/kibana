/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, HttpFetchOptions } from '@kbn/core/public';
import type {
  ClientRequestParamsOf,
  ReturnOf,
  RouteRepositoryClient,
} from '@kbn/server-route-repository';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { StreamsRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: unknown;
};

export type StreamsRepositoryClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type StreamsRepositoryClient = RouteRepositoryClient<
  StreamsRouteRepository,
  StreamsRepositoryClientOptions
>;

export type AutoAbortedStreamsRepositoryClient = RouteRepositoryClient<
  StreamsRouteRepository,
  Omit<StreamsRepositoryClientOptions, 'signal'>
>;

export type StreamsRepositoryEndpoint = keyof StreamsRouteRepository;

export type APIReturnType<TEndpoint extends StreamsRepositoryEndpoint> = ReturnOf<
  StreamsRouteRepository,
  TEndpoint
>;

export type StreamsAPIClientRequestParamsOf<TEndpoint extends StreamsRepositoryEndpoint> =
  ClientRequestParamsOf<StreamsRouteRepository, TEndpoint>;

export function createStreamsRepositoryClient(
  core: CoreStart | CoreSetup
): StreamsRepositoryClient {
  return createRepositoryClient(core);
}
