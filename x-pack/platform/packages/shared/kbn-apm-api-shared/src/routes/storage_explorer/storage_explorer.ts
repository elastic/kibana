/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { indexLifecyclePhaseSchema, environmentSchema } from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, probabilitySchema } from '../../default_api_types';

export type StorageExplorerServiceStatisticsResponse = Array<{
  serviceName: string;
  sampling: number;
  environments: string[];
  size: number;
  agentName: AgentName;
}>;

export interface StorageExplorerRouteResponse {
  serviceStatistics: StorageExplorerServiceStatisticsResponse;
}

export const storageExplorerRoute = defineRoute<StorageExplorerRouteResponse>()({
  endpoint: 'GET /internal/apm/storage_explorer',
  params: z.object({
    query: indexLifecyclePhaseSchema
      .merge(probabilitySchema)
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema),
  }),
});
