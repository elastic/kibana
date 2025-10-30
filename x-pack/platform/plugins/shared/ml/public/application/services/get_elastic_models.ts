/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type HttpStart } from '@kbn/core-http-browser';
import { ElasticModels } from './elastic_models_service';
import { HttpService } from './http_service';
import { trainedModelsApiProvider } from './ml_api_service/trained_models';

/**
 * Provides Elastic models services exposed from the plugin start.
 */
export function getElasticModels(httpStart: HttpStart) {
  const httpService = new HttpService(httpStart);
  const trainedModelApi = trainedModelsApiProvider(httpService);

  return new ElasticModels(trainedModelApi);
}
