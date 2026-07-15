/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { BaseFlameGraph } from '@kbn/profiling-utils';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  rangeSchema,
  kuerySchema,
  serviceTransactionDataSourceSchema,
} from '../../default_api_types';

export interface ProfilingHostsFlamegraphResponse {
  flamegraph: BaseFlameGraph;
  hostNames: string[];
  containerIds: string[];
}

export const profilingHostsFlamegraphRoute = defineRoute<ProfilingHostsFlamegraphResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/hosts/flamegraph',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: rangeSchema
      .merge(environmentSchema)
      .merge(serviceTransactionDataSourceSchema)
      .merge(kuerySchema),
  }),
});
