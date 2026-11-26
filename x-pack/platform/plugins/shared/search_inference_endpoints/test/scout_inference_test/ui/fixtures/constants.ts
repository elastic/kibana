/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BREADCRUMBS = {
  stateful: {
    classic: ['Stack Management'],
    searchSolution: ['Stack Management', 'Model Management'],
  },
  serverless: {
    search: ['Model Management'],
  },
} as const;

export const INFERENCE_PAGES = {
  eisModels: {
    urlPath: 'management/modelManagement/elastic_inference_service',
  },
  externalInference: {
    urlPath: 'management/modelManagement/inference_endpoints',
  },
  featureSettings: {
    urlPath: 'management/modelManagement/model_settings',
  },
} as const;
