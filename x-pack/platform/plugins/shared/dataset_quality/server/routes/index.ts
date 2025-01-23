/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EndpointOf, ServerRouteRepository } from '@kbn/server-route-repository';
import { dataStreamsRouteRepository } from './data_streams/routes';
import { integrationsRouteRepository } from './integrations/routes';

function getTypedDatasetQualityServerRouteRepository() {
  const repository = {
    ...dataStreamsRouteRepository,
    ...integrationsRouteRepository,
  };

  return repository;
}

export const getDatasetQualityServerRouteRepository = (): ServerRouteRepository => {
  return getTypedDatasetQualityServerRouteRepository();
};

export type DatasetQualityServerRouteRepository = ReturnType<
  typeof getTypedDatasetQualityServerRouteRepository
>;

export type APIEndpoint = EndpointOf<DatasetQualityServerRouteRepository>;
