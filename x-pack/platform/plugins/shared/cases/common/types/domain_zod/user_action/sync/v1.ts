/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';

export const SyncUserActionPayloadSchema = z.object({
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
});

export const SyncUserActionSchema = z.object({
  type: z.literal(UserActionTypes.sync),
  payload: SyncUserActionPayloadSchema,
});
