/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, HttpFetchOptions } from '@kbn/core/public';
import type { RouteRepositoryClient } from '@kbn/server-route-repository';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { GenAiSettingsServerRouteRepository } from '../../server';

export type GenAiSettingsAPIClientOptions = Omit<
  Omit<HttpFetchOptions, 'body'> & { body?: any },
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type GenAiSettingsAPIClient = RouteRepositoryClient<
  GenAiSettingsServerRouteRepository,
  GenAiSettingsAPIClientOptions
>['fetch'];

export function createCallGenAiSettingsAPI(core: CoreStart | CoreSetup): GenAiSettingsAPIClient {
  return createRepositoryClient<GenAiSettingsServerRouteRepository, GenAiSettingsAPIClientOptions>(
    core
  ).fetch;
}
