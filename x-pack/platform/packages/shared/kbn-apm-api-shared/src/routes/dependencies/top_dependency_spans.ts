/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import type { AgentName, EventOutcome } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, kueryRt } from '../../default_api_types';

export interface DependencySpan {
  '@timestamp': number;
  spanId: string;
  spanName: string;
  serviceName: string;
  agentName: AgentName;
  traceId: string;
  transactionId?: string;
  transactionType?: string;
  transactionName?: string;
  duration: number;
  outcome: EventOutcome;
}

export interface TopDependencySpansResponse {
  spans: DependencySpan[];
}

export const topDependencySpansRoute = defineRoute<TopDependencySpansResponse>()({
  endpoint: 'GET /internal/apm/dependencies/operations/spans',
  params: t.type({
    query: t.intersection([
      rangeRt,
      environmentRt,
      kueryRt,
      t.type({ dependencyName: t.string, spanName: t.string }),
      t.partial({ sampleRangeFrom: toNumberRt, sampleRangeTo: toNumberRt }),
    ]),
  }),
});
