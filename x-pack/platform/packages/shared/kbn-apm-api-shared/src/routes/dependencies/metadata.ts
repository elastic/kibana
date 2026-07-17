/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface MetadataForDependencyResponse {
  spanType: string | undefined;
  spanSubtype: string | undefined;
}

export interface DependencyMetadataRouteResponse {
  metadata: MetadataForDependencyResponse;
}

export const dependencyMetadataRoute = defineRoute<DependencyMetadataRouteResponse>()({
  endpoint: 'GET /internal/apm/dependencies/metadata',
  params: z.object({
    query: z.object({ dependencyName: z.string() }).merge(rangeSchema),
  }),
});
