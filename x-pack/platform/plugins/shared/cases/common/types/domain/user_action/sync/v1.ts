/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';

/**
 * Recorded when the case is reconciled from its external incident.
 * `updated_fields` were applied; `conflicted_fields` were kept because the
 * case's conflict strategy favoured the Kibana value.
 */
export const SyncUserActionPayloadSchema = lazySchema(() =>
  z.object({
    sync: z.object({
      connector_name: z.string(),
      external_id: z.string(),
      external_title: z.string(),
      external_url: z.string(),
      updated_fields: z.array(z.string()),
      conflicted_fields: z.array(z.string()),
      external_updated_at: z.string().optional(),
      external_updated_by: z.string().optional(),
    }),
  })
);

export const SyncUserActionSchema = lazySchema(() =>
  z.object({
    type: z.literal(UserActionTypes.sync),
    payload: SyncUserActionPayloadSchema,
  })
);
