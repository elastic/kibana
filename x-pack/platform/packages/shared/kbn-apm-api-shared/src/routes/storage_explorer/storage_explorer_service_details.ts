/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { ProcessorEvent } from '@kbn/apm-types-shared';
import { indexLifecyclePhaseRt } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, probabilityRt } from '../../default_api_types';

export interface StorageDetailsResponse {
  processorEventStats: Array<{
    processorEvent: ProcessorEvent;
    docs: number;
    size: number;
  }>;
  indicesStats: Array<{
    indexName: string;
    numberOfDocs: number;
    primary: string | number | undefined;
    replica: string | number | undefined;
    size: number | undefined;
    dataStream: string | undefined;
    lifecyclePhase: string | undefined;
  }>;
}

export const storageExplorerServiceDetailsRoute = defineRoute<StorageDetailsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/storage_details',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([indexLifecyclePhaseRt, probabilityRt, environmentRt, kueryRt, rangeRt]),
  }),
});
