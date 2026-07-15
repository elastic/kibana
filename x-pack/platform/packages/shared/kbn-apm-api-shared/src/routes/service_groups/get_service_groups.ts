/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedServiceGroup } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface ServiceGroupsResponse {
  serviceGroups: SavedServiceGroup[];
}

export const serviceGroupsRoute = defineRoute<ServiceGroupsResponse>()({
  endpoint: 'GET /internal/apm/service-groups',
});
