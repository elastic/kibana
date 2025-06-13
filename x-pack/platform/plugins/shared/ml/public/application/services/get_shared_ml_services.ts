/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';

export type MlSharedServices = ReturnType<typeof getMlSharedServices>;

/**
 * Provides ML services exposed from the plugin start.
 */
export async function getMlSharedServices(httpStart: HttpStart) {
  const { HttpService } = await import('@kbn/ml-services/http_service');
  const { mlApiProvider } = await import('@kbn/ml-services/ml_api_service');

  const httpService = new HttpService(httpStart);
  return mlApiProvider(httpService);
}
