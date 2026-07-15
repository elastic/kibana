/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { Transaction, APMError } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface ErrorSampleDetailsResponse {
  transaction: Transaction | undefined;
  error: Omit<APMError, 'transaction' | 'error'> & {
    transaction?: { id?: string; type?: string };
    user_agent?: { name?: string; version?: string };
    error: {
      id: string;
    } & Omit<APMError['error'], 'exception' | 'log'> & {
        exception?: APMError['error']['exception'];
        log?: APMError['error']['log'];
      };
  };
}

export const errorSampleDetailsRoute = defineRoute<ErrorSampleDetailsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}',
  params: z.object({
    path: z.object({ serviceName: z.string(), groupId: z.string(), errorId: z.string() }),
    query: environmentSchema.merge(kuerySchema).merge(rangeSchema),
  }),
});
