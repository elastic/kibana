/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudStart } from '@kbn/cloud-plugin/server';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { FleetStartContract } from '@kbn/fleet-plugin/server';
import { createFetchFlamechart } from './fetch_flamechart';
import { createGetStatusService } from './status';
import { ProfilingESClient } from '../../common/profiling_es_client';
import { createFetchFunctions } from './functions';
import { createSetupState } from './setup_state';

export interface RegisterServicesParams {
  createProfilingEsClient: (params: {
    esClient: ElasticsearchClient;
    useDefaultAuth?: boolean;
  }) => ProfilingESClient;
  logger: Logger;
  deps: {
    fleet?: FleetStartContract;
    cloud?: CloudStart;
  };
}

export function registerServices(params: RegisterServicesParams) {
  return {
    fetchFlamechartData: createFetchFlamechart(params),
    getStatus: createGetStatusService(params),
    getSetupState: createSetupState(params),
    fetchFunctions: createFetchFunctions(params),
  };
}
