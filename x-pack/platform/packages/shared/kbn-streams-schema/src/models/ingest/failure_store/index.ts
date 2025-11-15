/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
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

export interface FailureStoreInherit {
  inherit: {};
}

export interface FailureStoreDisabled {
  enabled: boolean;
}

export interface FailureStoreEnabled {
  enabled: boolean;
  lifecycle?: {
    enabled: boolean;
    data_retention?: string;
  };
}

export type FailureStore = FailureStoreInherit | FailureStoreEnabled | FailureStoreDisabled;

export const effectiveFailureStoreSchema: z.Schema<EffectiveFailureStore> = z.object({
  enabled: z.boolean(),
  retentionPeriod: z.object({
    default: z.optional(NonEmptyString),
    custom: z.optional(NonEmptyString),
  }),
});

const inheritFailureStoreSchema = z.object({ inherit: z.strictObject({}) });
const disabledFailureStoreSchema = z.object({ enabled: z.boolean() });
const enabledFailureStoreSchema = z
  .object({
    enabled: z.boolean(),
    lifecycle: z.optional(
      z.object({
        enabled: z.boolean(),
        data_retention: z.optional(NonEmptyString),
      })
    ),
  })
  .strict();

export const failureStoreSchema: z.Schema<FailureStore> = z.union([
  inheritFailureStoreSchema,
  enabledFailureStoreSchema,
  disabledFailureStoreSchema,
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
