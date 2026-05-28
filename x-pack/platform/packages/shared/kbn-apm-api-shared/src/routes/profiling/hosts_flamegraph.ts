/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { BaseFlameGraph } from '@kbn/profiling-utils';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, kueryRt, serviceTransactionDataSourceRt } from '../../default_api_types';

export interface ProfilingHostsFlamegraphResponse {
  flamegraph: BaseFlameGraph;
  hostNames: string[];
  containerIds: string[];
}

export const profilingHostsFlamegraphRoute = defineRoute<ProfilingHostsFlamegraphResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/hosts/flamegraph',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([rangeRt, environmentRt, serviceTransactionDataSourceRt, kueryRt]),
  }),
});
