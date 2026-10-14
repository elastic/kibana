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

/** Execution statuses after which a workflow execution no longer changes. */
const TERMINAL_EXECUTION_STATUSES = ['completed', 'failed', 'cancelled', 'timed_out'];

export interface WorkflowSummary {
  id: string;
  name: string;
}

export interface WorkflowExecutionSummary {
  id: string;
  status: string;
  triggeredBy?: string;
  executedBy?: string;
  error: unknown;
}

interface WorkflowExecutionListResponse {
  results: WorkflowExecutionSummary[];
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
  /** Polls until the workflow has an execution in a terminal status, and returns it. */
  waitForFinishedExecution: (workflowId: string) => Promise<WorkflowExecutionSummary>;
}

const describeExecutions = (executions: WorkflowExecutionSummary[]): string =>
  executions.length === 0
    ? 'none'
    : executions
        .map(
          ({ id, status, triggeredBy, executedBy, error }) =>
            `${id}(status=${status}, triggeredBy=${triggeredBy}, executedBy=${executedBy}, ` +
            `error=${JSON.stringify(error)})`
        )
        .join('; ');

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

  waitForFinishedExecution: (workflowId) =>
    measurePerformanceAsync(log, 'workflows.waitForFinishedExecution', async () => {
      let seen: WorkflowExecutionSummary[] = [];
      let lastLogged = '';

      const findFinished = async (): Promise<WorkflowExecutionSummary | undefined> => {
        const response = await kbnClient.request<WorkflowExecutionListResponse>({
          method: 'GET',
          path: `${WORKFLOWS_API_PATH}/workflow/${encodeURIComponent(workflowId)}/executions`,
          headers: COMMON_HEADERS,
          retries: 0,
        });
        seen = response.data.results;

        const summary = describeExecutions(seen);
        if (summary !== lastLogged) {
          lastLogged = summary;
          log.info(`Executions of workflow [${workflowId}]: ${summary}`);
        }

        return seen.find(({ status }) => TERMINAL_EXECUTION_STATUSES.includes(status));
      };

      try {
        await expect
          .poll(async () => (await findFinished())?.id, {
            timeout: POLL_TIMEOUT_MS,
            intervals: [POLL_INTERVAL_MS],
          })
          .toBeDefined();
      } catch (error) {
        throw new Error(
          `Workflow [${workflowId}] has no finished execution after ${POLL_TIMEOUT_MS}ms. ` +
            `Executions seen: ${describeExecutions(seen)}`,
          { cause: error }
        );
      }

      const execution = await findFinished();
      if (!execution) {
        throw new Error(`Workflow ${workflowId} has no finished execution`);
      }
      return execution;
    }),
});
