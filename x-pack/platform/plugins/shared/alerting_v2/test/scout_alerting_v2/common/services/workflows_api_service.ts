/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { COMMON_HEADERS } from '../constants';

const WORKFLOWS_API_PATH = '/api/workflows';

export interface WorkflowSummary {
  id: string;
  name: string;
}

/**
 * Minimal workflows client used to seed the destinations that action policies
 * point at. Action policy destinations are workflow references, so UI specs
 * that drive the `destinationsInput` combo box need at least one real workflow
 * for the workflows plugin to return.
 */
export interface WorkflowsApiService {
  create: (yaml: string) => Promise<WorkflowSummary>;
  bulkDelete: (ids: string[]) => Promise<void>;
}

export const getWorkflowsApiService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): WorkflowsApiService => ({
  create: (yaml) =>
    measurePerformanceAsync(log, 'workflows.create', async () => {
      const response = await kbnClient.request<WorkflowSummary>({
        method: 'POST',
        path: `${WORKFLOWS_API_PATH}/workflow`,
        headers: COMMON_HEADERS,
        body: { yaml },
      });
      return response.data;
    }),

  bulkDelete: (ids) =>
    measurePerformanceAsync(log, 'workflows.bulkDelete', async () => {
      if (ids.length === 0) return;

      await kbnClient.request({
        method: 'DELETE',
        path: WORKFLOWS_API_PATH,
        headers: COMMON_HEADERS,
        body: { ids },
        ignoreErrors: [404],
        retries: 0,
      });
    }),
});
