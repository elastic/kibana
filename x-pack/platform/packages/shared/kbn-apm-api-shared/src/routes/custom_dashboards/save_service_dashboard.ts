/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { SavedApmCustomDashboard } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { MAX_FIELD_VALUE_LENGTH, MAX_KUERY_LENGTH } from '../../constants';

export type SaveServiceDashboardResponse = SavedApmCustomDashboard;

export const saveServiceDashboardRoute = defineRoute<SaveServiceDashboardResponse>()({
  endpoint: 'POST /internal/apm/custom-dashboard',
  params: lazySchema(() =>
    z.object({
      query: z
        .object({
          customDashboardId: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
        })
        .optional(),
      body: z.object({
        dashboardSavedObjectId: z.string().max(MAX_FIELD_VALUE_LENGTH),
        kuery: z.string().max(MAX_KUERY_LENGTH).optional(),
        serviceNameFilterEnabled: z.boolean(),
        serviceEnvironmentFilterEnabled: z.boolean(),
      }),
    })
  ),
});
