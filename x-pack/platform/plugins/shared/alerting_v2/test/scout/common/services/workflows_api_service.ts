/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../constants';

const WORKFLOWS_API_PATH = '/api/workflows';

/** Largest page the executions route accepts. */
const EXECUTIONS_MAX_PAGE_SIZE = 100;

export interface WorkflowSummary {
  id: string;
  name: string;
}

interface WorkflowExecutionListResponse {
  results: Array<{ triggeredBy?: string }>;
}

interface WaitForSuccessfulExecutionFilter {
  /** What started the execution, e.g. `action_policy` for the dispatcher. */
  triggeredBy: string;
}

/**
 * Minimal workflows client used to seed the destinations that action policies
 * point at, and to observe the executions the dispatcher starts on them. Action
 * policy destinations are workflow references, so UI specs that drive the
 * `destinationsInput` combo box need at least one real workflow for the
 * workflows plugin to return.
 */
export interface WorkflowsApiService {
  create: (yaml: string) => Promise<WorkflowSummary>;
  bulkDelete: (ids: string[]) => Promise<void>;
  /** Polls until the workflow has at least one completed execution started by `triggeredBy`. */
  waitForSuccessfulExecution: (
    workflowId: string,
    filter: WaitForSuccessfulExecutionFilter
  ) => Promise<void>;
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

  waitForSuccessfulExecution: (workflowId, { triggeredBy }) =>
    measurePerformanceAsync(log, 'workflows.waitForSuccessfulExecution', async () => {
      const countSuccessfulExecutions = async (): Promise<number> => {
        const response = await kbnClient.request<WorkflowExecutionListResponse>({
          method: 'GET',
          path: `${WORKFLOWS_API_PATH}/workflow/${encodeURIComponent(workflowId)}/executions`,
          headers: COMMON_HEADERS,
          query: { statuses: 'completed', size: EXECUTIONS_MAX_PAGE_SIZE },
          retries: 0,
        });
        return response.data.results.filter((execution) => execution.triggeredBy === triggeredBy)
          .length;
      };

      await expect
        .poll(() => countSuccessfulExecutions(), {
          timeout: POLL_TIMEOUT_MS,
          intervals: [POLL_INTERVAL_MS],
        })
        .toBeGreaterThanOrEqual(1);
    }),
});
