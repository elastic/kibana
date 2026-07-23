/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { SavedServiceGroup } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface ServiceGroupResponse {
  serviceGroup: SavedServiceGroup;
}

export const serviceGroupRoute = defineRoute<ServiceGroupResponse>()({
  endpoint: 'GET /internal/apm/service-group',
  params: z.object({
    query: z.object({ serviceGroup: z.string() }),
  }),
});
