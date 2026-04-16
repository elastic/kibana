/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import {
  ExecutionStatus,
  type WorkflowExecutionEngineModel,
  type WorkflowExecutionListItemDto,
  type WorkflowYaml,
  NonTerminalExecutionStatuses,
} from '@kbn/workflows';
import { StatusError } from '../streams/errors/status_error';
import { pollUntil } from './poll_until';

// Concurrency is keyed per stream (max: 1, strategy: drop), so the number of
// non-terminal executions is bounded by the number of distinct streams. 10k is
// a safe upper bound that avoids pagination while covering any realistic deployment.
export const NON_TERMINAL_EXECUTIONS_PAGE_SIZE = 10_000;

const COMPLETED_EXECUTIONS_PAGE_SIZE = 100;

export interface WorkflowExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  error?: string;
  duration?: number | null;
  output?: Record<string, unknown>;
}

export interface WorkflowClient<TInputs extends Record<string, unknown> = Record<string, never>> {
  ensureExists(request: KibanaRequest): Promise<void>;
  ensureEnabled(enabled: boolean, request: KibanaRequest): Promise<void>;
  remove(request: KibanaRequest): Promise<void>;

  run(
    inputs: TInputs,
    request: KibanaRequest,
    executionSource?: string
  ): Promise<{ executionId: string }>;
  cancel(executionId: string): Promise<void>;
  cancelAll(): Promise<void>;
  getStatus(executionId: string): Promise<WorkflowExecutionResult>;

  getNonTerminalExecutions(): Promise<{
    results: WorkflowExecutionListItemDto[];
    total: number;
  }>;
  getActiveExecution(
    predicate: (execution: WorkflowExecutionListItemDto) => boolean
  ): Promise<WorkflowExecutionResult | null>;
  getLastCompletedExecution(
    predicate: (execution: WorkflowExecutionListItemDto) => boolean,
    options?: { maxAgeMs?: number }
  ): Promise<WorkflowExecutionListItemDto | null>;
  getCompletedExecutions(options?: { maxAgeMs?: number }): Promise<WorkflowExecutionListItemDto[]>;
}

interface WorkflowClientParams {
  workflowId: string;
  yaml: string;
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
}

export const createWorkflowClient = <
  TInputs extends Record<string, unknown> = Record<string, never>
>({
  workflowId,
  yaml,
  logger,
  managementApi,
}: WorkflowClientParams): WorkflowClient<TInputs> => {
  const log = logger.get(`workflow-client:${workflowId}`);

  const toEngineModel = (workflow: {
    id: string;
    name: string;
    enabled: boolean;
    definition: WorkflowYaml;
    yaml: string;
  }): WorkflowExecutionEngineModel => ({
    id: workflow.id,
    name: workflow.name,
    enabled: workflow.enabled,
    definition: workflow.definition,
    yaml: workflow.yaml,
  });

  const getNonTerminalExecutions = async () => {
    const { results, total } = await managementApi.getWorkflowExecutions(
      {
        workflowId,
        statuses: [...NonTerminalExecutionStatuses],
        size: NON_TERMINAL_EXECUTIONS_PAGE_SIZE,
      },
      DEFAULT_SPACE_ID
    );
    return { results, total };
  };

  const requestCancellation = async () => {
    const { results } = await getNonTerminalExecutions();
    if (results.length === 0) return;

    await Promise.all(
      results.map((r) => managementApi.cancelWorkflowExecution(r.id, DEFAULT_SPACE_ID))
    );

    log.debug(() => `Requested cancellation for ${results.length} running execution(s)`);
  };

  const cancelAndAwaitTermination = async () => {
    await requestCancellation();

    await pollUntil(
      () => getNonTerminalExecutions(),
      ({ total }) => total === 0
    );
  };

  const hardDelete = async (request: KibanaRequest) => {
    await cancelAndAwaitTermination().catch((err) =>
      log.warn(`Failed to cancel running workflow executions: ${err}`)
    );

    const { deleted, failures } = await managementApi.deleteWorkflows(
      [workflowId],
      DEFAULT_SPACE_ID,
      request,
      { force: true }
    );

    if (deleted === 0 && failures.length > 0) {
      const reasons = failures.map((f) => `${f.id}: ${f.error}`).join('; ');
      throw new Error(`Failed to delete workflow ${workflowId}: ${reasons}`);
    }
  };

  const ensureWorkflow = async (request: KibanaRequest): Promise<WorkflowExecutionEngineModel> => {
    const existing = await managementApi.getWorkflow(workflowId, DEFAULT_SPACE_ID);

    if (existing?.yaml === yaml) {
      if (!existing.enabled) {
        throw new StatusError(`Workflow ${workflowId} is disabled.`, 400);
      }
      if (!existing.definition) {
        throw new StatusError(`Workflow ${workflowId} definition is missing.`, 500);
      }
      return toEngineModel({ ...existing, definition: existing.definition });
    }

    if (existing) {
      log.info('Workflow YAML changed, re-creating');
      await hardDelete(request);
    } else {
      log.info('Workflow not found, creating');
    }

    await managementApi.createWorkflow({ yaml, id: workflowId }, DEFAULT_SPACE_ID, request);

    const created = await managementApi.getWorkflow(workflowId, DEFAULT_SPACE_ID);

    if (!created) {
      throw new StatusError(`Failed to create workflow ${workflowId}.`, 500);
    }
    if (!created.definition) {
      throw new StatusError(`Workflow ${workflowId} definition is missing after creation.`, 500);
    }

    return toEngineModel({ ...created, definition: created.definition });
  };

  const removeIfExists = async (request: KibanaRequest): Promise<boolean> => {
    const existing = await managementApi.getWorkflow(workflowId, DEFAULT_SPACE_ID);
    if (!existing) return false;

    await hardDelete(request);
    return true;
  };

  // TODO: The workflow plugin's getWorkflowExecutions strips `context` from list items,
  // so predicates that inspect context.inputs (e.g. streamName) require a follow-up
  // getWorkflowExecution call per item. This N+1 overhead should be eliminated once
  // the workflow team adds support for including context in list responses or
  // server-side filtering by context fields.
  const enrichWithContext = async (
    item: WorkflowExecutionListItemDto
  ): Promise<WorkflowExecutionListItemDto> => {
    const full = await managementApi.getWorkflowExecution(item.id, DEFAULT_SPACE_ID);
    return full ? { ...item, context: full.context } : item;
  };

  const ENRICH_CONCURRENCY = 5;
  const enrichBatch = async (
    items: WorkflowExecutionListItemDto[]
  ): Promise<WorkflowExecutionListItemDto[]> => {
    const enriched: WorkflowExecutionListItemDto[] = [];
    for (let i = 0; i < items.length; i += ENRICH_CONCURRENCY) {
      const chunk = items.slice(i, i + ENRICH_CONCURRENCY);
      const results = await Promise.all(chunk.map(enrichWithContext));
      enriched.push(...results);
    }
    return enriched;
  };

  // NOTE: The workflow management API sorts by createdAt desc, not finishedAt desc.
  // The cutoff check below is therefore approximate — an execution created before the
  // cutoff might have finished after it. For short-lived workflows this is acceptable;
  // callers that need exact finishedAt ordering should sort results client-side.
  const forEachCompletedExecution = async <T>(
    maxAgeMs: number | undefined,
    reducer: {
      init: () => T;
      step: (acc: T, exec: WorkflowExecutionListItemDto) => { acc: T; done: boolean };
    }
  ): Promise<T> => {
    const cutoff = maxAgeMs ? Date.now() - maxAgeMs : undefined;
    let page = 1;
    let acc = reducer.init();

    while (true) {
      const { results, total } = await managementApi.getWorkflowExecutions(
        {
          workflowId,
          statuses: [ExecutionStatus.COMPLETED],
          size: COMPLETED_EXECUTIONS_PAGE_SIZE,
          page,
        },
        DEFAULT_SPACE_ID
      );

      const withinCutoff = cutoff
        ? results.filter((exec) => new Date(exec.finishedAt).getTime() >= cutoff)
        : results;

      const enriched = await enrichBatch(withinCutoff);
      for (const e of enriched) {
        const result = reducer.step(acc, e);
        acc = result.acc;
        if (result.done) return acc;
      }

      if (page * COMPLETED_EXECUTIONS_PAGE_SIZE >= total) return acc;
      page++;
    }
  };

  return {
    async ensureExists(request) {
      await ensureWorkflow(request);
    },

    async ensureEnabled(enabled, request) {
      if (enabled) {
        await ensureWorkflow(request);
      } else if (await removeIfExists(request)) {
        log.info(`Disabled and removed workflow ${workflowId}`);
      }
    },

    async remove(request) {
      if (await removeIfExists(request)) {
        log.info(`Removed workflow ${workflowId}`);
      }
    },

    async run(inputs, request, executionSource) {
      const workflow = await ensureWorkflow(request);

      const filteredInputs: Record<string, unknown> = Object.fromEntries(
        Object.entries(inputs).filter(([, v]) => v !== undefined)
      );

      const executionId = await managementApi.runWorkflow(
        workflow,
        DEFAULT_SPACE_ID,
        filteredInputs,
        request,
        executionSource
      );

      log.debug(() => `Started workflow execution: ${executionId}`);

      return { executionId };
    },

    async cancel(executionId) {
      await managementApi.cancelWorkflowExecution(executionId, DEFAULT_SPACE_ID);
      log.debug(() => `Cancelled workflow execution ${executionId}`);
    },

    async cancelAll() {
      await requestCancellation();
    },

    async getStatus(executionId) {
      const execution = await managementApi.getWorkflowExecution(executionId, DEFAULT_SPACE_ID, {
        includeOutput: true,
      });

      if (!execution) {
        throw new StatusError(`Workflow execution ${executionId} not found`, 404);
      }

      const ctx = execution.context ?? {};
      let output: Record<string, unknown> = {};
      if (typeof ctx === 'object' && ctx !== null && 'output' in ctx) {
        const raw = ctx.output;
        if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
          output = raw as Record<string, unknown>;
        }
      }
      return {
        executionId: execution.id,
        status: execution.status,
        error: execution.error?.message,
        duration: execution.duration,
        output,
      };
    },

    getNonTerminalExecutions,

    // TODO: Replace with server-side filtering once the workflow plugin supports
    // concurrencyGroupKey and finishedAfter/finishedBefore filters in getWorkflowExecutions.
    async getLastCompletedExecution(predicate, options) {
      return forEachCompletedExecution(options?.maxAgeMs, {
        init: (): WorkflowExecutionListItemDto | null => null,
        step: (acc, exec) => {
          const matched = predicate(exec);
          return { acc: matched ? exec : acc, done: matched };
        },
      });
    },

    async getCompletedExecutions(options) {
      return forEachCompletedExecution(options?.maxAgeMs, {
        init: (): WorkflowExecutionListItemDto[] => [],
        step: (acc, exec) => {
          acc.push(exec);
          return { acc, done: false };
        },
      });
    },

    async getActiveExecution(predicate) {
      const { results } = await getNonTerminalExecutions();
      const enrichedResults = await enrichBatch(results);

      for (const enriched of enrichedResults) {
        if (predicate(enriched)) {
          return {
            executionId: enriched.id,
            status: enriched.status,
            error: enriched.error?.message,
            duration: enriched.duration,
          };
        }
      }

      return null;
    },
  };
};
