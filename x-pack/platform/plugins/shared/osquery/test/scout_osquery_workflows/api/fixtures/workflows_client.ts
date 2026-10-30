/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const TERMINAL = ['completed', 'failed', 'cancelled', 'timed_out', 'skipped'];

export interface StepExecution {
  stepId: string;
  status: string;
  error?: { type: string; message: string; details?: { code?: string } };
  output?: Record<string, any>;
  state?: {
    __durableStepState?: {
      customState?: { action_id: string; queries: Array<{ query_id: string; action_id: string }> };
    };
  };
}

export interface WorkflowExecution {
  id: string;
  status: string;
  error?: { type: string; message: string; details?: { code?: string } };
  stepExecutions: StepExecution[];
}

/** Workflows created and not yet deleted, so a failed test still gets them removed. */
const pendingDeletions = new Map<string, () => Promise<unknown>>();

/** Action ids (parent and per-query) the steps dispatched, for removing their documents. */
const dispatchedActionIds = new Set<string>();

/** The action ids dispatched since the last call. */
export const takeDispatchedActionIds = (): string[] => {
  const ids = [...dispatchedActionIds];
  dispatchedActionIds.clear();

  return ids;
};

/** Deletes every workflow a test created and did not delete, e.g. because an assertion threw. */
export const deleteLeftoverWorkflows = async (): Promise<void> => {
  const deletions = [...pendingDeletions.values()];
  pendingDeletions.clear();
  await Promise.all(deletions.map((remove) => remove().catch(() => undefined)));
};

/** Creates and runs workflows as the identity behind `headers` (an API key or a cookie). */
export const workflowsClient = (apiClient: ApiClientFixture, headers: Record<string, string>) => {
  const allHeaders = { 'kbn-xsrf': 'true', ...headers };
  // Without `force` the delete is soft: the workflow stays and its id is not reusable.
  const remove = async (workflowId: string) => {
    const response = await apiClient.delete(
      `api/workflows/workflow/${workflowId}?force=true&acknowledgeAclLoss=true`,
      { headers: allHeaders }
    );
    if (response.statusCode >= 300 && response.statusCode !== 404) {
      throw new Error(`Deleting workflow ${workflowId} failed with ${response.statusCode}`);
    }
  };

  const getExecution = async (executionId: string): Promise<WorkflowExecution> => {
    const response = await apiClient.get(
      `api/workflows/executions/${executionId}?includeOutput=true`,
      { headers: allHeaders, responseType: 'json' }
    );
    expect(response).toHaveStatusCode(200);

    return response.body as WorkflowExecution;
  };

  const waitFor = async (
    executionId: string,
    done: (execution: WorkflowExecution) => boolean,
    timeoutMs: number
  ): Promise<WorkflowExecution> => {
    const deadline = Date.now() + timeoutMs;
    let execution = await getExecution(executionId);
    while (!done(execution)) {
      if (Date.now() > deadline) {
        throw new Error(`Execution ${executionId} still ${execution.status} after ${timeoutMs}ms`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      execution = await getExecution(executionId);
    }

    return execution;
  };

  return {
    /** Creates a manual workflow with the given steps YAML and returns its id. */
    create: async (name: string, stepsYaml: string): Promise<string> => {
      const yaml = `name: ${name}\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n${stepsYaml}`;
      const response = await apiClient.post('api/workflows', {
        headers: allHeaders,
        body: { workflows: [{ yaml }] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const [created] = response.body.created;
      expect(created.valid).toBe(true);

      pendingDeletions.set(created.id, () => remove(created.id));

      return created.id as string;
    },

    delete: async (workflowId: string) => {
      // Forgotten only once the delete worked, so a failed one is retried by the cleanup hook.
      await remove(workflowId);
      pendingDeletions.delete(workflowId);
    },

    run: async (workflowId: string): Promise<string> => {
      const response = await apiClient.post(`api/workflows/workflow/${workflowId}/run`, {
        headers: allHeaders,
        body: { inputs: {} },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      return response.body.workflowExecutionId as string;
    },

    /** Waits until the step has dispatched and returns its per-query action ids. */
    waitForDispatch: async (executionId: string, stepId: string, timeoutMs = 60_000) => {
      const execution = await waitFor(
        executionId,
        (current) =>
          TERMINAL.includes(current.status) ||
          !!current.stepExecutions.find((step) => step.stepId === stepId)?.state?.__durableStepState
            ?.customState,
        timeoutMs
      );
      const state = execution.stepExecutions.find((step) => step.stepId === stepId)?.state
        ?.__durableStepState?.customState;
      if (!state) {
        throw new Error(
          `Step ${stepId} did not dispatch: ${execution.status} ${JSON.stringify(execution.error)}`
        );
      }

      dispatchedActionIds.add(state.action_id);
      state.queries.forEach((query) => dispatchedActionIds.add(query.action_id));

      return state;
    },

    waitForEnd: (executionId: string, timeoutMs = 120_000) =>
      waitFor(executionId, (current) => TERMINAL.includes(current.status), timeoutMs),
  };
};

export const stepOf = (execution: WorkflowExecution, stepId: string): StepExecution => {
  const step = execution.stepExecutions.find((candidate) => candidate.stepId === stepId);
  if (!step) throw new Error(`No step ${stepId} in execution ${execution.id}`);

  return step;
};
