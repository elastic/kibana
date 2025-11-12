/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesDataStreamFailureStore } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';

export interface EffectiveFailureStore {
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

export const effectiveFailureStoreSchema: z.Schema<EffectiveFailureStore> = z.object({
  enabled: z.boolean(),
  retentionPeriod: z.object({
    default: z.optional(NonEmptyString),
    custom: z.optional(NonEmptyString),
  }),
});

export type FailureStore = IndicesDataStreamFailureStore | { inherit: {} };

export const failureStoreSchema: z.Schema<FailureStore> = z.union([
  z.object({ inherit: z.object({}) }).strict(),
  z
    .object({
      enabled: z.optional(z.boolean()),
      lifecycle: z.optional(
        z.object({
          enabled: z.boolean(),
          data_retention: z.optional(NonEmptyString),
        })
      ),
    })
    .strict(),
]);

export const failureStoreStatsSchema: z.Schema<FailureStoreStatsResponse> = z.object({
  size: z.number().min(0).optional(),
  count: z.number().min(0).optional(),
  creationDate: z.number().min(0).optional(),
});

export interface WiredIngestStreamEffectiveFailureStore extends EffectiveFailureStore {
  from: string;
}

export const wiredIngestStreamEffectiveFailureStoreSchema: z.Schema<WiredIngestStreamEffectiveFailureStore> =
  z.object({
    enabled: z.boolean(),
    retentionPeriod: z.object({
      default: z.optional(NonEmptyString),
      custom: z.optional(NonEmptyString),
    }),
    from: z.string(),
  });

export function isInheritFailureStore(
  input: FailureStore | undefined
): input is { inherit: {} } | undefined {
  return !input || 'inherit' in input;
}
