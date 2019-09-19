/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { indexPatternRoute } from './index_pattern';
import {
  errorDistributionRoute,
  errorGroupsRoute,
  errorsRoute
} from './errors';
import {
  serviceAgentNameRoute,
  serviceTransactionTypesRoute,
  servicesRoute
} from './services';
import {
  agentConfigurationRoute,
  agentConfigurationSearchRoute,
  createAgentConfigurationRoute,
  deleteAgentConfigurationRoute,
  listAgentConfigurationEnvironmentsRoute,
  listAgentConfigurationServicesRoute,
  updateAgentConfigurationRoute
} from './settings';
import { metricsChartsRoute } from './metrics';
import { tracesRoute, tracesByIdRoute } from './traces';
import {
  transactionGroupsBreakdownRoute,
  transactionGroupsChartsRoute,
  transactionGroupsDistributionRoute,
  transactionGroupsRoute,
  transactionGroupsAvgDurationByCountry
} from './transaction_groups';
import {
  errorGroupsLocalFiltersRoute,
  metricsLocalFiltersRoute,
  servicesLocalFiltersRoute,
  tracesLocalFiltersRoute,
  transactionGroupsLocalFiltersRoute,
  transactionsLocalFiltersRoute,
  uiFiltersEnvironmentsRoute
} from './ui_filters';
import { createApi } from './create_api';

const createApmApi = () => {
  const api = createApi()
    .add(indexPatternRoute)
    .add(errorDistributionRoute)
    .add(errorGroupsRoute)
    .add(errorsRoute)
    .add(metricsChartsRoute)
    .add(serviceAgentNameRoute)
    .add(serviceTransactionTypesRoute)
    .add(servicesRoute)
    .add(agentConfigurationRoute)
    .add(agentConfigurationSearchRoute)
    .add(createAgentConfigurationRoute)
    .add(deleteAgentConfigurationRoute)
    .add(listAgentConfigurationEnvironmentsRoute)
    .add(listAgentConfigurationServicesRoute)
    .add(updateAgentConfigurationRoute)
    .add(tracesRoute)
    .add(tracesByIdRoute)
    .add(transactionGroupsBreakdownRoute)
    .add(transactionGroupsChartsRoute)
    .add(transactionGroupsDistributionRoute)
    .add(transactionGroupsRoute)
    .add(transactionGroupsAvgDurationByCountry)
    .add(errorGroupsLocalFiltersRoute)
    .add(metricsLocalFiltersRoute)
    .add(servicesLocalFiltersRoute)
    .add(tracesLocalFiltersRoute)
    .add(transactionGroupsLocalFiltersRoute)
    .add(transactionsLocalFiltersRoute)
    .add(uiFiltersEnvironmentsRoute);

  return api;
};

export type APMAPI = ReturnType<typeof createApmApi>;

export { createApmApi };
