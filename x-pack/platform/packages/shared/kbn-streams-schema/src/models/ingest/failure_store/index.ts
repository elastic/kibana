/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { isSchema } from '../../../shared/type_guards';

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
  lifecycle: { enabled: { data_retention?: string } };
}

export interface FailureStoreDisabledLifecycle {
  lifecycle: { disabled: {} };
}

export type EffectiveFailureStore =
  | FailureStoreDisabled
  | FailureStoreEnabled
  | FailureStoreDisabledLifecycle;

export type FailureStore =
  | FailureStoreInherit
  | FailureStoreEnabled
  | FailureStoreDisabled
  | FailureStoreDisabledLifecycle;

export type WiredIngestStreamEffectiveFailureStore = EffectiveFailureStore & { from: string };

const inheritFailureStoreSchema = z.object({ inherit: z.strictObject({}) });
const disabledFailureStoreSchema = z.object({ disabled: z.strictObject({}) });
export const enabledFailureStoreSchema = z.object({
  lifecycle: z.object({
    enabled: z.object({ data_retention: NonEmptyString.optional() }),
  }),
});
const disabledLifecycleFailureStoreSchema = z.object({
  lifecycle: z.object({ disabled: z.strictObject({}) }),
});

export const effectiveFailureStoreSchema: z.Schema<EffectiveFailureStore> = z.union([
  enabledFailureStoreSchema,
  disabledFailureStoreSchema,
  disabledLifecycleFailureStoreSchema,
]);

export const failureStoreSchema: z.Schema<FailureStore> = z.union([
  inheritFailureStoreSchema,
  enabledFailureStoreSchema,
  disabledFailureStoreSchema,
  disabledLifecycleFailureStoreSchema,
]);

export const failureStoreStatsSchema: z.Schema<FailureStoreStatsResponse> = z.object({
  size: z.number().min(0).optional(),
  count: z.number().min(0).optional(),
  creationDate: z.number().min(0).optional(),
});

export const wiredIngestStreamEffectiveFailureStoreSchema: z.Schema<WiredIngestStreamEffectiveFailureStore> =
  z
    .union([
      enabledFailureStoreSchema,
      disabledFailureStoreSchema,
      disabledLifecycleFailureStoreSchema,
    ])
    .and(z.object({ from: NonEmptyString }));

export const isEnabledLifecycleFailureStore = (
  input: EffectiveFailureStore | FailureStore
): boolean => {
  return isSchema(enabledFailureStoreSchema, input);
};

export const isDisabledLifecycleFailureStore = (
  input: EffectiveFailureStore | FailureStore
): boolean => {
  return isSchema(disabledLifecycleFailureStoreSchema, input);
};

export function isEnabledFailureStore(
  input: EffectiveFailureStore | FailureStore
): input is
  | z.input<typeof enabledFailureStoreSchema>
  | z.input<typeof disabledLifecycleFailureStoreSchema> {
  return isEnabledLifecycleFailureStore(input) || isDisabledLifecycleFailureStore(input);
}

export function isInheritFailureStore(input: FailureStore): input is { inherit: {} } {
  return isSchema(inheritFailureStoreSchema, input);
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
