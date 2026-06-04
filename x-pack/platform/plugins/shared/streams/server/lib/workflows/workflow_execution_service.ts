/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type {
  WorkflowsManagementApi,
  WorkflowsServerPluginSetup,
} from '@kbn/workflows-management-plugin/server';
import { WorkflowStatus } from '@kbn/streams-schema';

export class WorkflowExecutionService {
  private readonly managementApi: WorkflowsServerPluginSetup['management'];

  constructor({ managementApi }: { managementApi: WorkflowsServerPluginSetup['management'] }) {
    this.managementApi = managementApi;
  }

  /**
   * Maps a raw workflow engine `ExecutionStatus` to the shared domain status.
   * Does not cover `NotStarted` (no execution exists) or `BeingCanceled` (client-only optimistic state).
   */
  static classifyExecutionStatus(
    status: ExecutionStatus
  ):
    | WorkflowStatus.InProgress
    | WorkflowStatus.Completed
    | WorkflowStatus.Failed
    | WorkflowStatus.Canceled {
    switch (status) {
      case ExecutionStatus.PENDING:
      case ExecutionStatus.RUNNING:
      case ExecutionStatus.WAITING:
      case ExecutionStatus.WAITING_FOR_INPUT:
      case ExecutionStatus.WAITING_FOR_CHILD:
        return WorkflowStatus.InProgress;
      case ExecutionStatus.COMPLETED:
        return WorkflowStatus.Completed;
      case ExecutionStatus.FAILED:
      case ExecutionStatus.TIMED_OUT:
        return WorkflowStatus.Failed;
      case ExecutionStatus.CANCELLED:
      case ExecutionStatus.SKIPPED:
        return WorkflowStatus.Canceled;
      default:
        const _exhaustiveCheck: never = status;
        return _exhaustiveCheck;
    }
  }

  static getFailureMessage(
    execution: Pick<WorkflowExecutionListItemDto, 'status' | 'error'>,
    timedOutMessage: string
  ): string {
    if (execution.status === ExecutionStatus.TIMED_OUT) {
      return timedOutMessage;
    }
    return execution.error?.message ?? 'Unknown error';
  }

  async execute({
    workflowId,
    executionSpaceId,
    inputs,
    request,
    notFoundMessage,
  }: {
    workflowId: string;
    executionSpaceId: string;
    inputs: Record<string, unknown>;
    request: KibanaRequest;
    notFoundMessage?: string;
  }): Promise<string> {
    const workflow = await this.managementApi.getWorkflow(workflowId, GLOBAL_WORKFLOW_SPACE_ID);

    if (!workflow || !workflow.definition) {
      throw new Error(notFoundMessage ?? `Workflow ${workflowId} not found`);
    }

    return this.managementApi.runWorkflow(
      { ...workflow, definition: workflow.definition },
      executionSpaceId,
      inputs,
      request
    );
  }

  async cancelLatest({
    workflowId,
    spaceId,
    request,
    concurrencyGroupKey,
  }: {
    workflowId: string;
    spaceId: string;
    request: KibanaRequest;
    concurrencyGroupKey?: string;
  }): Promise<string | null> {
    const { results } = await this.managementApi.getWorkflowExecutions(
      {
        workflowId,
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

  async getExecutions(
    params: Parameters<WorkflowsManagementApi['getWorkflowExecutions']>[0],
    spaceId: string
  ) {
    return this.managementApi.getWorkflowExecutions(params, spaceId);
  }

  async getExecution(
    id: string,
    spaceId: string,
    options?: Parameters<WorkflowsManagementApi['getWorkflowExecution']>[2]
  ) {
    return this.managementApi.getWorkflowExecution(id, spaceId, options);
  }

  async cancelExecution(id: string, spaceId: string, request: KibanaRequest): Promise<void> {
    return this.managementApi.cancelWorkflowExecution(id, spaceId, request);
  }
}
