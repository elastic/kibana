/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import {
  createServiceAccountParamsSchema,
  SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE,
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  serviceAccountIdSchema,
} from '../../../common/service_accounts';

export const createServiceAccountBodySchema = createServiceAccountParamsSchema
  // Rejects unknown keys, so callers cannot supply `assumable_by` or `role_assignments` — Kibana
  // derives both itself.
  .strict();

export const listServiceAccountsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE).optional(),
  after: z.string().min(1).max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH).optional(),
});

export const getServiceAccountParamsSchema = z.object({
  id: serviceAccountIdSchema.min(1),
});
