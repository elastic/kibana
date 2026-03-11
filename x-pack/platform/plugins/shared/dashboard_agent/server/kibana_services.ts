/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAgentStartDependencies } from './types';

let dataViews: DashboardAgentStartDependencies['dataViews'] | undefined;

export const setKibanaServices = (deps: DashboardAgentStartDependencies): void => {
  dataViews = deps.dataViews;
};

export const getDataViewsServiceFactory = (): DashboardAgentStartDependencies['dataViews'] => {
  if (!dataViews) {
    throw new Error('Dashboard agent data views service has not been initialized.');
  }

  return dataViews;
};
