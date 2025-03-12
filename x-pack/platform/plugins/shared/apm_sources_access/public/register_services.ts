/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { APMIndices } from '../common/config_schema';

export interface RegisterServicesParams {
  http: HttpStart;
}

export function registerServices(params: RegisterServicesParams) {
  return createApmDataAccessService(params);
}

export function createApmDataAccessService({ http }: RegisterServicesParams) {
  const getApmIndices = async () => {
    try {
      const indices = await http.get<APMIndices>('/internal/apm-sources/settings/apm-indices');

      return indices;
    } catch (error) {
      // If unsuccessful, just assume no indices are available from APM.
      // We will fallback to default settings regardless
      return undefined;
    }
  };

  const apmSourcesService = {
    getApmIndices,
  };

  return apmSourcesService;
}
