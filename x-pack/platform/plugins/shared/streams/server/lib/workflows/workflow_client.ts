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
  type WorkflowDetailDto,
  type WorkflowExecutionEngineModel,
  type WorkflowExecutionListItemDto,
  NonTerminalExecutionStatuses,
} from '@kbn/workflows';
import { StatusError } from '../streams/errors/status_error';
import { pollUntil } from './poll_until';

export interface WorkflowExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  error?: string;
  duration?: number | null;
  output?: Record<string, unknown>;
}

export interface WorkflowClient<TInputs extends Record<string, unknown>> {
  ensureExists(request: KibanaRequest): Promise<void>;
  remove(request: KibanaRequest): Promise<void>;

  run(
    inputs: TInputs,
    request: KibanaRequest,
    executionSource?: string
  ): Promise<{ executionId: string }>;
  cancel(executionId: string): Promise<void>;
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

export const getStreamNameFromExecution = (
  exec: WorkflowExecutionListItemDto
): string | undefined => {
  const inputs = (exec.context as Record<string, Record<string, unknown>> | undefined)?.inputs;
  return (inputs as Record<string, unknown> | undefined)?.streamName as string | undefined;
};

export const streamNamePredicate = (name: string) => {
  return (exec: WorkflowExecutionListItemDto) => getStreamNameFromExecution(exec) === name;
};

export const createWorkflowClient = <TInputs extends Record<string, unknown>>({
  workflowId,
  yaml,
  logger,
  managementApi,
}: WorkflowClientParams): WorkflowClient<TInputs> => {
  const log = logger.get(`workflow-client:${workflowId}`);

  const getWorkflowForExecution = async (): Promise<WorkflowExecutionEngineModel> => {
    const workflow = await managementApi.getWorkflow(workflowId, DEFAULT_SPACE_ID);

    if (!workflow) {
      throw new StatusError(`Workflow ${workflowId} not found.`, 404);
    }
    if (!workflow.enabled) {
      throw new StatusError(`Workflow ${workflowId} is disabled.`, 400);
    }
    if (!workflow.definition) {
      throw new StatusError(`Workflow ${workflowId} definition is missing.`, 500);
    }
    return {
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
      definition: workflow.definition,
      yaml: workflow.yaml,
    };
  };

  const getNonTerminalExecutions = async () => {
    const { results, total } = await managementApi.getWorkflowExecutions(
      {
        workflowId,
        statuses: [...NonTerminalExecutionStatuses],
      },
      DEFAULT_SPACE_ID
    );
    return { results, total };
  };

  const cancelAndAwaitTermination = async () => {
    const { results } = await getNonTerminalExecutions();
    if (results.length === 0) return;

    await Promise.all(
      results.map((r) => managementApi.cancelWorkflowExecution(r.id, DEFAULT_SPACE_ID))
    );

    log.debug(() => `Requested cancellation for ${results.length} running execution(s)`);

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

  const ensureWorkflow = async (request: KibanaRequest): Promise<WorkflowDetailDto> => {
    const existing = await managementApi.getWorkflow(workflowId, DEFAULT_SPACE_ID);

    if (existing?.yaml === yaml) {
      return existing;
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

    return created;
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

  const paginateCompletedExecutions = async (
    maxAgeMs: number | undefined,
    visitor: (exec: WorkflowExecutionListItemDto) => 'match' | 'continue'
  ): Promise<WorkflowExecutionListItemDto | null> => {
    const cutoff = maxAgeMs ? Date.now() - maxAgeMs : undefined;
    const pageSize = 100;
    let page = 1;

    while (true) {
      const { results, total } = await managementApi.getWorkflowExecutions(
        {
          workflowId,
          statuses: [ExecutionStatus.COMPLETED],
          size: pageSize,
          page,
        },
        DEFAULT_SPACE_ID
      );

      for (const exec of results) {
        if (cutoff && new Date(exec.finishedAt).getTime() < cutoff) {
          return null;
        }
        const enriched = await enrichWithContext(exec);
        if (visitor(enriched) === 'match') {
          return enriched;
        }
      }

      if (page * pageSize >= total) {
        return null;
      }
      page++;
    }
  };

  return {
    async ensureExists(request) {
      await ensureWorkflow(request);
    },

    async remove(request) {
      const existing = await managementApi.getWorkflow(workflowId, DEFAULT_SPACE_ID);
      if (!existing) return;

      await hardDelete(request);
      log.info(`Removed workflow ${workflowId}`);
    },

    async run(inputs, request, executionSource) {
      await ensureWorkflow(request);
      const workflow = await getWorkflowForExecution();

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

    async getStatus(executionId) {
      const execution = await managementApi.getWorkflowExecution(executionId, DEFAULT_SPACE_ID, {
        includeOutput: true,
      });

      if (!execution) {
        throw new StatusError(`Workflow execution ${executionId} not found`, 404);
      }

      const ctx = (execution.context ?? {}) as Record<string, unknown>;
      return {
        executionId: execution.id,
        status: execution.status,
        error: execution.error?.message,
        duration: execution.duration,
        output: (ctx.output as Record<string, unknown>) ?? {},
      };
    },

    getNonTerminalExecutions,

    // TODO: Replace with server-side filtering once the workflow plugin supports
    // concurrencyGroupKey and finishedAfter/finishedBefore filters in getWorkflowExecutions.
    async getLastCompletedExecution(predicate, options) {
      return paginateCompletedExecutions(options?.maxAgeMs, (exec) =>
        predicate(exec) ? 'match' : 'continue'
      );
    },

    async getCompletedExecutions(options) {
      const collected: WorkflowExecutionListItemDto[] = [];
      await paginateCompletedExecutions(options?.maxAgeMs, (exec) => {
        // Items are already enriched with context by paginateCompletedExecutions
        collected.push(exec);
        return 'continue';
      });
      return collected;
    },

    async getActiveExecution(predicate) {
      const { results } = await getNonTerminalExecutions();

      for (const item of results) {
        const enriched = await enrichWithContext(item);
        if (predicate(enriched)) {
          return {
            executionId: item.id,
            status: item.status,
            error: item.error?.message,
            duration: item.duration,
          };
        }
      }

      return null;
    },
  };
};
