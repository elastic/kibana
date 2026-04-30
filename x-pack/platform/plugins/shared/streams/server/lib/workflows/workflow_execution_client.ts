/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type {
  ExecutionStatus,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
  WorkflowExecutionListItemDto,
} from '@kbn/workflows';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

export type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export interface WorkflowExecutionResult {
  executionId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timed_out' | 'not_found';
  startedAt?: string;
  finishedAt?: string;
  duration?: number | null;
  error?: string | null;
  output?: Record<string, unknown>;
}

const STATUS_MAP: Record<ExecutionStatus, WorkflowExecutionResult['status']> = {
  pending: 'pending',
  waiting: 'running',
  waiting_for_input: 'running',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
  timed_out: 'timed_out',
  skipped: 'completed',
};

const mapStatus = (status: ExecutionStatus): WorkflowExecutionResult['status'] =>
  STATUS_MAP[status] ?? 'failed';

const mapListItem = (execution: WorkflowExecutionListItemDto): WorkflowExecutionResult => ({
  executionId: execution.id,
  status: mapStatus(execution.status),
  startedAt: execution.startedAt,
  finishedAt: execution.finishedAt,
  duration: execution.duration,
  error: execution.error?.message ?? null,
});

const getStreamNameFromContext = (
  context: Record<string, unknown> | undefined
): string | undefined => {
  const inputs = context?.inputs;
  if (inputs && typeof inputs === 'object' && 'streamName' in inputs) {
    return String((inputs as Record<string, unknown>).streamName);
  }
  return undefined;
};

// TODO: The Workflows Management API doesn't expose `context` or
// `concurrencyGroupKey` on list items, so we must fetch the full execution
// for each candidate to extract `streamName`. Push for native filtering
// support (by concurrencyGroupKey, context field) to eliminate this N+1.
const MAX_SEARCH_SIZE = 50;

export class WorkflowExecutionClient {
  constructor(
    private readonly managementApi: WorkflowsManagementApi,
    private readonly workflowId: string
  ) {}

  async run(
    inputs: Record<string, unknown>,
    request: KibanaRequest
  ): Promise<WorkflowExecutionResult> {
    const workflow = await this.managementApi.getWorkflow(this.workflowId, DEFAULT_SPACE_ID);
    if (!workflow) {
      throw new Error(`Workflow ${this.workflowId} not found`);
    }
    if (!workflow.enabled) {
      throw new Error(`Workflow ${this.workflowId} is disabled`);
    }
    if (!workflow.definition) {
      throw new Error(`Workflow ${this.workflowId} has no definition`);
    }

    const workflowModel: WorkflowExecutionEngineModel = {
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
      definition: workflow.definition,
      yaml: workflow.yaml,
    };

    const executionId = await this.managementApi.runWorkflow(
      workflowModel,
      DEFAULT_SPACE_ID,
      inputs,
      request
    );

    return { executionId, status: 'pending' };
  }

  async getLatestExecution(streamName: string): Promise<WorkflowExecutionResult> {
    const match = await this.findExecutionForStream(streamName, [...NonTerminalExecutionStatuses]);
    if (match) {
      return mapListItem(match.listItem);
    }

    const terminalMatch = await this.findExecutionForStream(streamName);
    if (terminalMatch) {
      return {
        ...mapListItem(terminalMatch.listItem),
        output: terminalMatch.full.context,
      };
    }

    return { status: 'not_found' };
  }

  async getRunningStreamNames(): Promise<string[]> {
    const { results } = await this.managementApi.getWorkflowExecutions(
      {
        workflowId: this.workflowId,
        statuses: [...NonTerminalExecutionStatuses],
        omitStepRuns: true,
        size: MAX_SEARCH_SIZE,
      },
      DEFAULT_SPACE_ID
    );

    const names: string[] = [];
    for (const listItem of results) {
      const full = await this.managementApi.getWorkflowExecution(listItem.id, DEFAULT_SPACE_ID, {
        includeOutput: true,
      });
      const name = full && getStreamNameFromContext(full.context);
      if (name) {
        names.push(name);
      }
    }
    return names;
  }

  async cancelExecution(streamName: string): Promise<void> {
    const match = await this.findExecutionForStream(streamName, [...NonTerminalExecutionStatuses]);

    if (match) {
      await this.managementApi.cancelWorkflowExecution(match.listItem.id, DEFAULT_SPACE_ID);
    }
  }

  private async findExecutionForStream(
    streamName: string,
    statuses?: ExecutionStatus[]
  ): Promise<{ listItem: WorkflowExecutionListItemDto; full: WorkflowExecutionDto } | undefined> {
    const { results } = await this.managementApi.getWorkflowExecutions(
      {
        workflowId: this.workflowId,
        ...(statuses && { statuses }),
        omitStepRuns: true,
        size: MAX_SEARCH_SIZE,
      },
      DEFAULT_SPACE_ID
    );

    for (const listItem of results) {
      const full = await this.managementApi.getWorkflowExecution(listItem.id, DEFAULT_SPACE_ID, {
        includeOutput: true,
      });
      if (full && getStreamNameFromContext(full.context) === streamName) {
        return { listItem, full };
      }
    }

    return undefined;
  }
}
