/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { SavedApmCustomDashboard } from '@kbn/apm-types';
import { defineRoute } from '../types';

export type SaveServiceDashboardResponse = SavedApmCustomDashboard;

export const saveServiceDashboardRoute = defineRoute<SaveServiceDashboardResponse>()({
  endpoint: 'POST /internal/apm/custom-dashboard',
  params: t.type({
    query: t.union([
      t.partial({
        customDashboardId: t.string,
      }),
      t.undefined,
    ]),
    body: t.type({
      dashboardSavedObjectId: t.string,
      kuery: t.union([t.string, t.undefined]),
      serviceNameFilterEnabled: t.boolean,
      serviceEnvironmentFilterEnabled: t.boolean,
    }),
  }),
});
