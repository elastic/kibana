/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { AnomalyDetectorType, Environment, SloStatus } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  kuerySchema,
  rangeSchema,
  probabilitySchema,
  serviceTransactionDataSourceSchema,
} from '../../default_api_types';

export interface MergedServiceStat {
  serviceName: string;
  transactionType?: string;
  environments?: string[];
  agentName?: AgentName;
  latency?: number | null;
  transactionErrorRate?: number;
  throughput?: number;
  anomalyScore?: number;
  detectorType?: AnomalyDetectorType;
  anomalyEnvironment?: Environment;
  alertsCount?: number;
  sloStatus?: SloStatus;
  sloCount?: number;
}

export interface ServicesItemsResponse {
  items: MergedServiceStat[];
  maxCountExceeded: boolean;
  serviceOverflowCount: number;
}

export const servicesListRoute = defineRoute<ServicesItemsResponse>()({
  endpoint: 'GET /internal/apm/services',
  params: z.object({
    query: z
      .object({
        searchQuery: z.string(),
        serviceGroup: z.string(),
      })
      .partial()
      .merge(probabilitySchema)
      .merge(serviceTransactionDataSourceSchema)
      .merge(
        z.object({
          useDurationSummary: BooleanFromString.default(false),
        })
      )
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema),
  }),
});
