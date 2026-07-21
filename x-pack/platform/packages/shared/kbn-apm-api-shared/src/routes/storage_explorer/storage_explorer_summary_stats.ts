/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { indexLifecyclePhaseSchema, environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, probabilitySchema } from '../../default_api_types';

export interface StorageExplorerSummaryStatisticsResponse {
  tracesPerMinute: number;
  totalSize: number;
  diskSpaceUsedPct: number;
  numberOfServices: number;
  estimatedIncrementalSize: number;
  dailyDataGeneration: number;
}

export const storageExplorerSummaryStatsRoute =
  defineRoute<StorageExplorerSummaryStatisticsResponse>()({
    endpoint: 'GET /internal/apm/storage_explorer_summary_stats',
    params: z.object({
      query: indexLifecyclePhaseSchema
        .merge(probabilitySchema)
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema),
    }),
  });
