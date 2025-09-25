/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';

export interface FailureStore {
  enabled: boolean;
  retentionPeriod: {
    default?: string;
    custom?: string;
  };
}

export interface FailureStoreStatsResponse {
  size?: number;
  count?: number;
  creationDate?: number;
}

export const failureStoreSchema: z.Schema<FailureStore> = z.object({
  enabled: z.boolean(),
  retentionPeriod: z.object({
    default: NonEmptyString,
    custom: z.optional(NonEmptyString),
  }),
});

export const failureStoreStatsSchema: z.Schema<FailureStoreStatsResponse> = z.object({
  size: z.number().min(0).optional(),
  count: z.number().min(0).optional(),
  creationDate: z.number().min(0).optional(),
});

export type DataStreamWithFailureStore = IndicesDataStream & {
  failure_store: {
    enabled?: boolean;
    lifecycle?: {
      enabled?: boolean;
      data_retention?: string;
      effective_retention?: string;
      retention_determined_by?: 'default_failures_retention' | 'data_stream_configuration';
    };
  };
};
