/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { ServiceHealthStatus, SloStatus } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  kueryRt,
  rangeRt,
  probabilityRt,
  serviceTransactionDataSourceRt,
} from '../../default_api_types';

export interface MergedServiceStat {
  serviceName: string;
  transactionType?: string;
  environments?: string[];
  agentName?: AgentName;
  latency?: number | null;
  transactionErrorRate?: number;
  throughput?: number;
  healthStatus?: ServiceHealthStatus;
  anomalyScore?: number;
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
  params: t.type({
    query: t.intersection([
      t.partial({
        searchQuery: t.string,
        serviceGroup: t.string,
      }),
      t.intersection([
        probabilityRt,
        t.intersection([
          serviceTransactionDataSourceRt,
          t.type({
            useDurationSummary: toBooleanRt,
          }),
        ]),
        environmentRt,
        kueryRt,
        rangeRt,
      ]),
    ]),
  }),
});
