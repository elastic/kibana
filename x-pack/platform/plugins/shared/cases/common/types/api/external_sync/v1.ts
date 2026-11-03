/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

/** The connector id is the workload id; matches the longest one Core accepts for a binding. */
const MAX_EXTERNAL_SYNC_CONNECTOR_ID_LENGTH = 512;
const MAX_SERVICE_ACCOUNT_ID_LENGTH = 512;

export const ExternalSyncConnectorParamsSchema = lazySchema(() =>
  z.object({
    connector_id: z.string().min(1).max(MAX_EXTERNAL_SYNC_CONNECTOR_ID_LENGTH),
  })
);

export const ExternalSyncNotifyResponseSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    accepted_at: z.string(),
    /** How many cases were pushed to the incident; the sync runs for each of them. */
    cases: z.number(),
  })
);

export const ExternalSyncServiceAccountBindRequestSchema = lazySchema(() =>
  z.object({
    service_account_id: z.string().min(1).max(MAX_SERVICE_ACCOUNT_ID_LENGTH),
  })
);

export const ExternalSyncServiceAccountBindingSchema = lazySchema(() =>
  z.object({
    service_account_id: z.string(),
    bound_at: z.string(),
  })
);

export const ExternalSyncServiceAccountResponseSchema = lazySchema(() =>
  z.object({
    binding: ExternalSyncServiceAccountBindingSchema.nullable(),
  })
);

export const ExternalSyncServiceAccountUnbindResponseSchema = lazySchema(() =>
  z.object({
    unbound: z.boolean(),
  })
);

export type ExternalSyncConnectorParams = z.infer<typeof ExternalSyncConnectorParamsSchema>;
export type ExternalSyncNotifyResponse = z.infer<typeof ExternalSyncNotifyResponseSchema>;
export type ExternalSyncServiceAccountBindRequest = z.infer<
  typeof ExternalSyncServiceAccountBindRequestSchema
>;
export type ExternalSyncServiceAccountBinding = z.infer<
  typeof ExternalSyncServiceAccountBindingSchema
>;
export type ExternalSyncServiceAccountResponse = z.infer<
  typeof ExternalSyncServiceAccountResponseSchema
>;
export type ExternalSyncServiceAccountUnbindResponse = z.infer<
  typeof ExternalSyncServiceAccountUnbindResponseSchema
>;
