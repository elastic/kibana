/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  kuerySchema,
  rangeSchema,
  serviceTransactionDataSourceSchema,
} from '../../default_api_types';

export interface ServiceNodeMetadataResponse {
  host: string | number;
  containerId: string | number;
}

export const serviceNodeMetadataRoute = defineRoute<ServiceNodeMetadataResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
  params: z.object({
    path: z.object({
      serviceName: z.string(),
      serviceNodeName: z.string(),
    }),
    query: kuerySchema
      .merge(rangeSchema)
      .merge(environmentSchema)
      .merge(serviceTransactionDataSourceSchema),
  }),
});
