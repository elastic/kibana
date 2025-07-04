/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { ISearchStart } from '@kbn/data-plugin/public';
import { createLogSourcesService } from './log_sources_service';
import { createLogDataService } from './log_data_service';

export interface RegisterServicesParams {
  deps: {
    uiSettings: IUiSettingsClient;
    search: ISearchStart;
  };
}

export function registerServices(params: RegisterServicesParams) {
  const logSourcesService = createLogSourcesService(params);

  const logDataService = createLogDataService({ ...params, logSourcesService });

  return {
    logSourcesService,
    logDataService,
  };
}
