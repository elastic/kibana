/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type {
  WorkflowExecutionListItemDto,
  WorkflowExecutionCollapseField,
  WorkflowExecutionSortField,
  WorkflowExecutionSortOrder,
} from '@kbn/workflows';
import type {
  WorkflowsManagementApi,
  WorkflowsServerPluginSetup,
} from '@kbn/workflows-management-plugin/server';
import { SigEventsWorkflowStatus, type SigEventsWorkflowStatusResult } from '@kbn/streams-schema';

export interface WorkflowExecutionQueryParams {
  size?: number;
  statuses?: ExecutionStatus[];
  concurrencyGroupKey?: string;
  sortField?: WorkflowExecutionSortField;
  sortOrder?: WorkflowExecutionSortOrder;
  collapse?: WorkflowExecutionCollapseField;
}

interface WorkflowExecutionGetParams {
  id: string;
  spaceId: string;
  options?: Parameters<WorkflowsManagementApi['getWorkflowExecution']>[2];
}

interface WorkflowExecutionCancelParams {
  id: string;
  spaceId: string;
  request: KibanaRequest;
}

/**
 * Generic adapter over the workflow management API.
 * `TInput` types the inputs passed to `execute`; the cast to
 * `Record<string, unknown>` for the underlying API is done internally.
 */
export class WorkflowExecutionService<TInput extends object = {}> {
  private readonly managementApi: WorkflowsServerPluginSetup['management'];
  private readonly workflowId: string;
  private readonly workflowSpaceId: string;

  constructor({
    managementApi,
    workflowId,
    workflowSpaceId,
  }: {
    managementApi: WorkflowsServerPluginSetup['management'];
    workflowId: string;
    workflowSpaceId: string;
  }) {
    this.managementApi = managementApi;
    this.workflowId = workflowId;
    this.workflowSpaceId = workflowSpaceId;
  }

  static classifyExecutionStatus(
    status: ExecutionStatus
  ): Exclude<
    SigEventsWorkflowStatus,
    SigEventsWorkflowStatus.NotStarted | SigEventsWorkflowStatus.BeingCanceled
  > {
    switch (status) {
      case ExecutionStatus.PENDING:
      case ExecutionStatus.RUNNING:
      case ExecutionStatus.WAITING:
      case ExecutionStatus.WAITING_FOR_INPUT:
      case ExecutionStatus.WAITING_FOR_CHILD:
        return SigEventsWorkflowStatus.InProgress;
      case ExecutionStatus.COMPLETED:
        return SigEventsWorkflowStatus.Completed;
      case ExecutionStatus.FAILED:
      case ExecutionStatus.TIMED_OUT:
        return SigEventsWorkflowStatus.Failed;
      case ExecutionStatus.CANCELLED:
      case ExecutionStatus.SKIPPED:
        return SigEventsWorkflowStatus.Canceled;
      default: {
        const _exhaustiveCheck: never = status;
        throw new Error(`Unhandled ExecutionStatus: ${_exhaustiveCheck}`);
      }
    }
  }

  static getFailureMessage({
    execution,
    timedOutMessage,
  }: {
    execution: Pick<WorkflowExecutionListItemDto, 'status' | 'error'>;
    timedOutMessage: string;
  }): string {
    if (execution.status === ExecutionStatus.TIMED_OUT) {
      return timedOutMessage;
    }
    return execution.error?.message ?? 'Unknown error';
  }

  async getStatus({
    spaceId,
    timedOutMessage = 'Workflow timed out',
    queryParams = {},
  }: {
    spaceId: string;
    timedOutMessage?: string;
    queryParams?: WorkflowExecutionQueryParams;
  }): Promise<SigEventsWorkflowStatusResult> {
    const { results } = await this.getExecutions({ ...queryParams, size: 1 }, spaceId);
    const lastExecution = results[0] ?? null;

    if (!lastExecution) {
      return { status: SigEventsWorkflowStatus.NotStarted, executionId: null };
    }

    const status = WorkflowExecutionService.classifyExecutionStatus(lastExecution.status);

    if (status === SigEventsWorkflowStatus.Failed) {
      return {
        status: SigEventsWorkflowStatus.Failed,
        executionId: lastExecution.id,
        error: WorkflowExecutionService.getFailureMessage({
          execution: lastExecution,
          timedOutMessage,
        }),
      };
    }

    if (status === SigEventsWorkflowStatus.Completed) {
      return { status: SigEventsWorkflowStatus.Completed, executionId: lastExecution.id };
    }

    return { status, executionId: lastExecution.id };
  }

  /**
   * `TInput` is cast to `Record<string, unknown>` at the wire boundary — it
   * enforces the input shape for callers but not the underlying management API call.
   */
  async execute({
    executionSpaceId,
    inputs,
    request,
    notFoundMessage,
  }: {
    executionSpaceId: string;
    inputs?: TInput;
    request: KibanaRequest;
    notFoundMessage?: string;
  }): Promise<string> {
    const workflow = await this.managementApi.getWorkflow(this.workflowId, this.workflowSpaceId);

    if (!workflow || !workflow.definition) {
      throw new Error(notFoundMessage ?? `Workflow ${this.workflowId} not found`);
    }

    return this.managementApi.runWorkflow(
      { ...workflow, definition: workflow.definition },
      executionSpaceId,
      inputs ?? {},
      request
    );
  }

  async cancelLatest({
    spaceId,
    request,
    concurrencyGroupKey,
  }: {
    spaceId: string;
    request: KibanaRequest;
    concurrencyGroupKey?: string;
  }): Promise<string | null> {
    const { results } = await this.managementApi.getWorkflowExecutions(
      {
        workflowId: this.workflowId,
        ...(concurrencyGroupKey !== undefined && { concurrencyGroupKey }),
        size: 1,
      },
      spaceId
    );

    if (results.length > 0 && !isTerminalStatus(results[0].status)) {
      await this.managementApi.cancelWorkflowExecution(results[0].id, spaceId, request);
      return results[0].id;
    }

    return null;
  }

  async getExecutions(params: WorkflowExecutionQueryParams, spaceId: string) {
    return this.managementApi.getWorkflowExecutions(
      { workflowId: this.workflowId, ...params },
      spaceId
    );
  }

  async getLastExecution(spaceId: string): Promise<WorkflowExecutionListItemDto | null> {
    const { results } = await this.getExecutions(
      { size: 1, sortField: 'createdAt', sortOrder: 'desc' },
      spaceId
    );
    return results[0] ?? null;
  }

  async getExecution({ id, spaceId, options }: WorkflowExecutionGetParams) {
    return this.managementApi.getWorkflowExecution(id, spaceId, options);
  }

  async cancelExecution({ id, spaceId, request }: WorkflowExecutionCancelParams): Promise<void> {
    return this.managementApi.cancelWorkflowExecution(id, spaceId, request);
  }
}
