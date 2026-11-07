/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const TERMINAL = ['completed', 'failed', 'cancelled', 'timed_out', 'skipped'];
const DELETE_CONFLICT_ATTEMPTS = 6;
const DELETE_CONFLICT_DELAY_MS = 2000;

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

export interface CreatedWorkflow {
  id: string;
  valid: boolean;
}

export interface WorkflowValidation {
  valid: boolean;
  diagnostics: Array<{ severity: string; message: string; path?: Array<string | number> }>;
}

const manualWorkflowYaml = (name: string, stepsYaml: string) =>
  `name: ${name}\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n${stepsYaml}`;

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

/**
 * Creates and runs workflows as the identity behind `headers` (an API key or a cookie), in the
 * default space or in `spaceId`.
 */
export const workflowsClient = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  spaceId?: string
) => {
  const allHeaders = { 'kbn-xsrf': 'true', ...headers };
  const api = (path: string) => `${spaceId ? `s/${spaceId}/` : ''}api/workflows${path}`;
  // Without `force` the delete is soft: the workflow stays and its id is not reusable.
  // A force delete answers 409 while the engine is still finishing its writes for a run that just
  // reached a terminal status (running-execution check, version conflicts), so retry briefly.
  const remove = async (workflowId: string) => {
    for (let attempt = 1; ; attempt++) {
      const response = await apiClient.delete(
        api(`/workflow/${workflowId}?force=true&acknowledgeAclLoss=true`),
        { headers: allHeaders, responseType: 'json' }
      );
      if (response.statusCode < 300 || response.statusCode === 404) return;
      if (response.statusCode !== 409 || attempt >= DELETE_CONFLICT_ATTEMPTS) {
        throw new Error(
          `Deleting workflow ${workflowId} failed with ${response.statusCode}: ${JSON.stringify(
            response.body
          )}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, DELETE_CONFLICT_DELAY_MS));
    }
  };

  const getExecution = async (executionId: string): Promise<WorkflowExecution> => {
    const response = await apiClient.get(api(`/executions/${executionId}?includeOutput=true`), {
      headers: allHeaders,
      responseType: 'json',
    });
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

  /**
   * Saves a manual workflow with the given steps YAML. Bulk create saves an invalid workflow too
   * (as `valid: false`, without diagnostics), so every created id is queued for deletion.
   */
  const save = async (name: string, stepsYaml: string): Promise<CreatedWorkflow> => {
    const response = await apiClient.post(api(''), {
      headers: allHeaders,
      body: { workflows: [{ yaml: manualWorkflowYaml(name, stepsYaml) }] },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    const created: CreatedWorkflow[] = response.body.created ?? [];
    created.forEach(({ id }) => pendingDeletions.set(id, () => remove(id)));
    expect(created).toHaveLength(1);

    return created[0];
  };

  return {
    /** Creates a valid manual workflow with the given steps YAML and returns its id. */
    create: async (name: string, stepsYaml: string): Promise<string> => {
      const created = await save(name, stepsYaml);
      expect(created.valid).toBe(true);

      return created.id;
    },

    save,

    /** Validates a manual workflow without saving it: the diagnostics bulk create omits. */
    validate: async (name: string, stepsYaml: string): Promise<WorkflowValidation> => {
      const response = await apiClient.post(api('/validate'), {
        headers: {
          ...allHeaders,
          'elastic-api-version': '1',
          'x-elastic-internal-origin': 'kibana',
        },
        body: { yaml: manualWorkflowYaml(name, stepsYaml) },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      return response.body as WorkflowValidation;
    },

    delete: async (workflowId: string) => {
      // Forgotten only once the delete worked, so a failed one is retried by the cleanup hook.
      await remove(workflowId);
      pendingDeletions.delete(workflowId);
    },

    run: async (workflowId: string): Promise<string> => {
      const response = await apiClient.post(api(`/workflow/${workflowId}/run`), {
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
