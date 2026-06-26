/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { indexLifecyclePhaseRt } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export interface StorageExplorerGetServicesResponse {
  services: Array<{
    serviceName: string;
  }>;
}

export const storageExplorerGetServicesRoute = defineRoute<StorageExplorerGetServicesResponse>()({
  endpoint: 'GET /internal/apm/storage_explorer/get_services',
  params: t.type({
    query: t.intersection([indexLifecyclePhaseRt, environmentRt, kueryRt, rangeRt]),
  }),
});
