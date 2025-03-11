/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { OBSERVABILITY_APM_SOURCES_ACCESS_APM_SOURCES_ID } from '@kbn/management-settings-ids';
import type { APMIndices } from '../common/config_schema';

export interface RegisterServicesParams {
  deps: {
    uiSettings: IUiSettingsClient;
  };
}

export function registerServices(params: RegisterServicesParams) {
  return createApmDataAccessService(params);
}

export function createApmDataAccessService(params: RegisterServicesParams) {
  const { uiSettings } = params.deps;

  const getApmIndices = async () => {
    return uiSettings.get<APMIndices>(OBSERVABILITY_APM_SOURCES_ACCESS_APM_SOURCES_ID);
  };

  const apmSourcesService = {
    getApmIndices,
  };

  return apmSourcesService;
}
