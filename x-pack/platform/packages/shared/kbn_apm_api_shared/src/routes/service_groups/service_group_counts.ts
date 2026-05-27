/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defineRoute } from '../types';

export type ServiceGroupCounts = Record<string, { services: number; alerts: number }>;

export const serviceGroupCountsRoute = defineRoute<ServiceGroupCounts>()({
  endpoint: 'GET /internal/apm/service-group/counts',
});
