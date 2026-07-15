/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Workflow validation client for the Agent Builder converse cohort.
 *
 * Mirrors Dhrumil's `validate_authored_workflow` pipeline:
 *   1. Extract YAML from the converse response
 *   2. Create the workflow via POST /api/workflows
 *   3. Auto-enable if the model authored it disabled
 *   4. Run via POST /api/workflows/workflow/{id}/run
 *   5. Poll GET /api/workflows/executions/{id} until terminal
 *
 * The full detail (outcome, step statuses, errors) is returned so the
 * WorkflowValidation evaluator can score it.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';

const API_VERSION = '2023-10-31';

const WORKFLOWS_PATH = '/api/workflows';
const WORKFLOW_UPDATE_PATH = '/api/workflows/workflow/{workflow_id}';
const WORKFLOW_RUN_PATH = '/api/workflows/workflow/{workflow_id}/run';
const WORKFLOW_EXECUTION_PATH = '/api/workflows/executions/{execution_id}';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);
const POLL_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 3000;

export interface WorkflowValidationResult {
  readonly outcome:
    | 'no_yaml'
    | 'create_failed'
    | 'run_failed'
    | 'timed_out'
    | 'completed'
    | 'failed';
  readonly yamlPresent: boolean;
  readonly created: boolean;
  readonly workflowId: string;
  readonly createValid: boolean | null;
  readonly authoredEnabled: boolean | null;
  readonly autoEnabled: boolean;
  readonly createError: string;
  readonly runStarted: boolean;
  readonly executionId: string;
  readonly execStatus: string;
  readonly execError: string;
  readonly stepStatuses: ReadonlyArray<{ step: string; status: string }>;
  readonly authoredYaml: string;
}

const emptyResult = (yamlText: string): WorkflowValidationResult => ({
  outcome: 'no_yaml',
  yamlPresent: yamlText.length > 0,
  created: false,
  workflowId: '',
  createValid: null,
  authoredEnabled: null,
  autoEnabled: false,
  createError: '',
  runStarted: false,
  executionId: '',
  execStatus: '',
  execError: '',
  stepStatuses: [],
  authoredYaml: yamlText,
});

/**
 * Extract a workflow YAML block from a converse response message.
 * The model typically wraps YAML in a ```yaml fence.
 */
export const extractWorkflowYaml = (responseMessage: string): string => {
  if (!responseMessage) return '';

  const fenceMatch = responseMessage.match(/```ya?ml\s*\n([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();

  const bareMatch = responseMessage.match(
    /(name:\s*\n[\s\S]*?steps:\s*\n[\s\S]*?(?:\n[a-z]|\n\.\.\.|$))/i
  );
  if (bareMatch) return bareMatch[1].trim();

  return '';
};

export class WorkflowValidationClient {
  constructor(private readonly fetch: HttpHandler, private readonly log: ToolingLog) {}

  async validateAuthoredWorkflow(
    responseMessage: string,
    label: string
  ): Promise<WorkflowValidationResult> {
    const yamlText = extractWorkflowYaml(responseMessage);
    if (!yamlText) return emptyResult('');

    const result: Mutable<WorkflowValidationResult> = { ...emptyResult(yamlText) };

    try {
      const createResult = await this.createWorkflow(yamlText);
      result.created = createResult.created;
      result.workflowId = createResult.workflowId;
      result.createValid = createResult.valid;
      result.authoredEnabled = createResult.enabled;
      result.createError = createResult.error;

      if (!createResult.created || createResult.valid === false) {
        result.outcome = 'create_failed';
        return result;
      }

      if (createResult.enabled !== true) {
        const enabled = await this.enableWorkflow(createResult.workflowId);
        result.autoEnabled = enabled;
      }

      const runResult = await this.runWorkflow(createResult.workflowId, label);
      result.runStarted = runResult.started;
      result.executionId = runResult.executionId;
      result.execError = runResult.error;

      if (!runResult.started) {
        result.outcome = 'run_failed';
        return result;
      }

      const pollResult = await this.pollExecution(runResult.executionId);
      result.execStatus = pollResult.status;
      result.stepStatuses = pollResult.stepStatuses;
      result.execError = pollResult.error;

      if (pollResult.status === 'completed') {
        result.outcome = 'completed';
      } else if (TERMINAL_STATUSES.has(pollResult.status)) {
        result.outcome = 'failed';
      } else {
        result.outcome = 'timed_out';
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.error(new Error(`Workflow validation failed for ${label}: ${message}`));
      result.createError = result.createError || message;
      result.outcome = result.workflowId ? 'run_failed' : 'create_failed';
      return result;
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    if (!workflowId) return;
    const path = WORKFLOW_UPDATE_PATH.replace('{workflow_id}', encodeURIComponent(workflowId));
    try {
      await this.fetch(path, {
        method: 'DELETE',
        version: API_VERSION,
        headers: { 'kbn-xsrf': 'true' },
      });
    } catch (error) {
      this.log.warning(
        `Failed to delete workflow ${workflowId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async createWorkflow(yaml: string): Promise<{
    created: boolean;
    workflowId: string;
    valid: boolean | null;
    enabled: boolean | null;
    error: string;
  }> {
    const response = asResponse(
      await this.fetch(WORKFLOWS_PATH, {
        method: 'POST',
        version: API_VERSION,
        headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflows: [{ yaml }] }),
      })
    );

    const text = await response.text();
    if (!response.ok) {
      return {
        created: false,
        workflowId: '',
        valid: null,
        enabled: null,
        error: `HTTP ${response.status}: ${text.slice(0, 400)}`,
      };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text);
    } catch {
      return {
        created: false,
        workflowId: '',
        valid: null,
        enabled: null,
        error: `non-JSON response: ${text.slice(0, 300)}`,
      };
    }

    const created = (payload.created ?? payload.results ?? []) as Array<Record<string, unknown>>;
    const failed = (payload.failed ?? []) as Array<Record<string, unknown>>;

    if (Array.isArray(created) && created.length > 0) {
      const first = created[0];
      const id =
        (first.id as string) ?? ((first.workflow as Record<string, unknown>)?.id as string) ?? '';
      return {
        created: true,
        workflowId: id,
        valid: first.valid !== false,
        enabled: first.enabled === true,
        error: '',
      };
    }

    if (Array.isArray(failed) && failed.length > 0) {
      return {
        created: false,
        workflowId: '',
        valid: false,
        enabled: null,
        error: String(failed[0].error ?? failed[0]).slice(0, 600),
      };
    }

    return {
      created: false,
      workflowId: '',
      valid: null,
      enabled: null,
      error: `empty created/failed in response: ${text.slice(0, 300)}`,
    };
  }

  private async enableWorkflow(workflowId: string): Promise<boolean> {
    const path = WORKFLOW_UPDATE_PATH.replace('{workflow_id}', encodeURIComponent(workflowId));
    const response = asResponse(
      await this.fetch(path, {
        method: 'PUT',
        version: API_VERSION,
        headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })
    );
    return response.ok;
  }

  private async runWorkflow(
    workflowId: string,
    label: string
  ): Promise<{ started: boolean; executionId: string; error: string }> {
    const path = WORKFLOW_RUN_PATH.replace('{workflow_id}', encodeURIComponent(workflowId));
    const response = asResponse(
      await this.fetch(path, {
        method: 'POST',
        version: API_VERSION,
        headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            message: `[eval] ${label} (automated validation run)`,
            summary: `[eval] ${label} (automated validation run)`,
          },
        }),
      })
    );

    const text = await response.text();
    if (!response.ok) {
      return {
        started: false,
        executionId: '',
        error: `run HTTP ${response.status}: ${text.slice(0, 300)}`,
      };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text);
    } catch {
      return { started: false, executionId: '', error: `run non-JSON: ${text.slice(0, 200)}` };
    }

    const executionId = (payload.workflowExecutionId as string) ?? '';
    if (!executionId) {
      return { started: false, executionId: '', error: 'run response missing workflowExecutionId' };
    }

    return { started: true, executionId, error: '' };
  }

  private async pollExecution(executionId: string): Promise<{
    status: string;
    stepStatuses: ReadonlyArray<{ step: string; status: string }>;
    error: string;
  }> {
    const path =
      WORKFLOW_EXECUTION_PATH.replace('{execution_id}', encodeURIComponent(executionId)) +
      '?includeOutput=true';
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    let lastPayload: Record<string, unknown> = {};
    let status = '';

    while (Date.now() < deadline) {
      const response = asResponse(
        await this.fetch(path, {
          method: 'GET',
          version: API_VERSION,
        })
      );

      if (response.ok) {
        lastPayload = (await response.json()) as Record<string, unknown>;
        status = String(lastPayload.status ?? '').toLowerCase();

        if (TERMINAL_STATUSES.has(status)) break;
      }

      await sleep(POLL_INTERVAL_MS);
    }

    const stepExecutions = (lastPayload.stepExecutions ?? []) as Array<Record<string, unknown>>;
    const stepStatuses = stepExecutions.map((s) => ({
      step: String(s.stepId ?? s.name ?? ''),
      status: String(s.status ?? ''),
    }));

    let error = '';
    const rawError = lastPayload.error;
    if (rawError) {
      error = typeof rawError === 'string' ? rawError : JSON.stringify(rawError).slice(0, 500);
    }

    return { status, stepStatuses, error };
  }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const asResponse = (response: unknown): Response => {
  if (response instanceof Response) return response;
  throw new Error('Expected HttpHandler fetch to return a Response');
};
