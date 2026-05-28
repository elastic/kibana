/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defineRoute } from '../types';

export interface HasDataResponse {
  hasData: boolean;
}

export const hasDataRoute = defineRoute<HasDataResponse>()({
  endpoint: 'GET /internal/apm/has_data',
});
