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

export interface FailureStoreEnabledWithLifecycle {
  lifecycle: { enabled: { data_retention?: string } };
}

export interface FailureStoreEnabledWithoutLifecycle {
  lifecycle: { disabled: {} };
}

export type FailureStoreEnabled =
  | FailureStoreEnabledWithLifecycle
  | FailureStoreEnabledWithoutLifecycle;

export type EffectiveFailureStore = FailureStoreDisabled | FailureStoreEnabled;

export type FailureStore = FailureStoreInherit | FailureStoreEnabled | FailureStoreDisabled;

export type WiredIngestStreamEffectiveFailureStore = EffectiveFailureStore & { from: string };

const inheritFailureStoreSchema = z.object({ inherit: z.strictObject({}) });
const disabledFailureStoreSchema = z.object({ disabled: z.strictObject({}) });
export const enabledWithLifecycleFailureStoreSchema = z.object({
  lifecycle: z.object({
    enabled: z.object({ data_retention: NonEmptyString.optional() }),
  }),
});
const enabledWithoutLifecycleFailureStoreSchema = z.object({
  lifecycle: z.object({ disabled: z.strictObject({}) }),
});

export const effectiveFailureStoreSchema: z.Schema<EffectiveFailureStore> = z.union([
  enabledWithLifecycleFailureStoreSchema,
  disabledFailureStoreSchema,
  enabledWithoutLifecycleFailureStoreSchema,
]);

export const enabledFailureStoreSchema: z.Schema<FailureStoreEnabled> = z.union([
  enabledWithLifecycleFailureStoreSchema,
  enabledWithoutLifecycleFailureStoreSchema,
]);

export const failureStoreSchema: z.Schema<FailureStore> = z.union([
  inheritFailureStoreSchema,
  disabledFailureStoreSchema,
  enabledFailureStoreSchema,
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

export const isEnabledLifecycleFailureStore = (
  input: EffectiveFailureStore | FailureStore
): input is FailureStoreEnabledWithLifecycle => {
  return isSchema(enabledWithLifecycleFailureStoreSchema, input);
};

export const isDisabledLifecycleFailureStore = (
  input: EffectiveFailureStore | FailureStore
): input is FailureStoreEnabledWithoutLifecycle => {
  return isSchema(enabledWithoutLifecycleFailureStoreSchema, input);
};

export const isEnabledFailureStore = (
  input: EffectiveFailureStore | FailureStore
): input is FailureStoreEnabled => {
  return isSchema(enabledFailureStoreSchema, input);
};

export function isInheritFailureStore(input: FailureStore): input is FailureStoreInherit {
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
