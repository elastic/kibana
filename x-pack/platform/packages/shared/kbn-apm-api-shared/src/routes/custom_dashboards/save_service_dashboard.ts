/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { SavedApmCustomDashboard } from '@kbn/apm-types';
import { defineRoute } from '../types';

export type SaveServiceDashboardResponse = SavedApmCustomDashboard;

export const saveServiceDashboardRoute = defineRoute<SaveServiceDashboardResponse>()({
  endpoint: 'POST /internal/apm/custom-dashboard',
  params: z.object({
    query: z
      .object({
        customDashboardId: z.string().optional(),
      })
      .optional(),
    body: z.object({
      dashboardSavedObjectId: z.string(),
      kuery: z.string().optional(),
      serviceNameFilterEnabled: z.boolean(),
      serviceEnvironmentFilterEnabled: z.boolean(),
    }),
  }),
});
