/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';

export interface FailureStoreStatsResponse {
  size?: number;
  count?: number;
  creationDate?: number;
}

export interface FailureStoreInherit {
  inherit: {};
}

export interface FailureStoreDisabled {
  disabled: {};
}

export interface FailureStoreEnabled {
  lifecycle: { data_retention?: string };
}

export type EffectiveFailureStore = FailureStoreDisabled | FailureStoreEnabled;

export type FailureStore = FailureStoreInherit | FailureStoreEnabled | FailureStoreDisabled;

export type WiredIngestStreamEffectiveFailureStore = EffectiveFailureStore & { from: string };

const inheritFailureStoreSchema = z.object({ inherit: z.strictObject({}) });
const disabledFailureStoreSchema = z.object({ disabled: z.strictObject({}) });
export const enabledFailureStoreSchema = z.object({
  lifecycle: z.object({
    data_retention: NonEmptyString.optional(),
  }),
});

export const effectiveFailureStoreSchema: z.Schema<EffectiveFailureStore> = z.union([
  enabledFailureStoreSchema,
  disabledFailureStoreSchema,
]);

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

export const wiredIngestStreamEffectiveFailureStoreSchema: z.Schema<WiredIngestStreamEffectiveFailureStore> =
  z
    .union([enabledFailureStoreSchema, disabledFailureStoreSchema])
    .and(z.object({ from: NonEmptyString }));

export const isEnabledFailureStore = (input: EffectiveFailureStore | FailureStore): boolean => {
  if (!input) return false;
  return 'lifecycle' in input;
};

export function isInheritFailureStore(input: FailureStore): input is { inherit: {} } {
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
