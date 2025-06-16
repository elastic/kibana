/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RouteRepositoryClient } from '@kbn/server-route-repository';
import { HttpFetchOptions } from '@kbn/core/public';
import type { ObservabilityNavigationRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: any;
};

export type ObservabilityNavigationRepositoryClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type ObservabilityNavigationRepositoryClient = RouteRepositoryClient<
  ObservabilityNavigationRouteRepository,
  ObservabilityNavigationRepositoryClientOptions
>;
