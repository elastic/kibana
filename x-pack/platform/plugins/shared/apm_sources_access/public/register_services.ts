/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { type SourcesApiOptions, callSourcesAPI } from './api';
import type { APMIndices } from '../common/config_schema';

export interface RegisterServicesParams {
  http: HttpStart;
}

export function registerServices(params: RegisterServicesParams) {
  return createApmSourcesAccessService(params);
}

export function createApmSourcesAccessService({ http }: RegisterServicesParams) {
  const getApmIndexSettings = (options?: Omit<SourcesApiOptions, 'body'>) =>
    callSourcesAPI(http, 'GET /internal/apm-sources/settings/apm-index-settings', options);

  const getApmIndices = (options?: Omit<SourcesApiOptions, 'body'>) =>
    callSourcesAPI(http, 'GET /internal/apm-sources/settings/apm-indices', options);

  const saveApmIndices = (
    options: SourcesApiOptions & { body: Partial<Record<keyof APMIndices, string>> }
  ) => callSourcesAPI(http, 'POST /internal/apm-sources/settings/apm-indices/save', options);

  const apmSourcesService = {
    getApmIndices,
    getApmIndexSettings,
    saveApmIndices,
  };

  return apmSourcesService;
}
