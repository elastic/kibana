/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';

/**
 * Provides Elastic models services exposed from the plugin start.
 */
export async function getElasticModels(httpStart: HttpStart) {
  const { HttpService } = await import('@kbn/ml-services/http_service');
  const { trainedModelsApiProvider } = await import(
    '@kbn/ml-services/ml_api_service/trained_models'
  );
  const { ElasticModels } = await import('@kbn/ml-services/elastic_models_service');

  const httpService = new HttpService(httpStart);
  const trainedModelApi = trainedModelsApiProvider(httpService);

  return new ElasticModels(trainedModelApi);
}
