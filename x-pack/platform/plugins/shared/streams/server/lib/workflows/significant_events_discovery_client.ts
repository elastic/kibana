/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { WorkflowStatus } from '@kbn/streams-schema';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { WorkflowExecutionService } from './workflow_execution_service';

export interface SignificantEventsDiscoveryRunParams {
  request: KibanaRequest;
  spaceId: string;
  triggeredBy: 'manual' | 'scheduled';
}

export interface SignificantEventsDiscoveryStatusResult {
  status:
    | WorkflowStatus.NotStarted
    | WorkflowStatus.InProgress
    | WorkflowStatus.Completed
    | WorkflowStatus.Failed
    | WorkflowStatus.Canceled;
  executionId: string | null;
  error?: string;
}

/** Maps a workflow execution to the {@link SignificantEventsDiscoveryStatusResult} shape returned by the API. */
const mapExecutionToStatusResult = (
  execution: WorkflowExecutionListItemDto
): Omit<SignificantEventsDiscoveryStatusResult, 'executionId'> & { executionId: string } => {
  const status = WorkflowExecutionService.classifyExecutionStatus(execution.status);

  if (status === WorkflowStatus.Failed) {
    return {
      status: WorkflowStatus.Failed,
      executionId: execution.id,
      error: WorkflowExecutionService.getFailureMessage(
        execution,
        'Significant events discovery timed out'
      ),
    };
  }

  return { status, executionId: execution.id };
};

export class SignificantEventsDiscoveryClient {
  private readonly workflowExecutionService: WorkflowExecutionService;

  constructor({ managementApi }: { managementApi: WorkflowsServerPluginSetup['management'] }) {
    this.workflowExecutionService = new WorkflowExecutionService({ managementApi });
  }

  async run({
    request,
    spaceId,
    triggeredBy,
  }: SignificantEventsDiscoveryRunParams): Promise<{ executionId: string }> {
    // Guard against overlapping runs: status/cancel only track the latest execution,
    // so reuse an in-flight one instead of orphaning it with a parallel trigger.
    const { results } = await this.workflowExecutionService.getExecutions(
      { workflowId: SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID, size: 1 },
      spaceId
    );
    if (results.length > 0 && !isTerminalStatus(results[0].status)) {
      return { executionId: results[0].id };
    }

    const executionId = await this.workflowExecutionService.execute({
      workflowId: SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
      executionSpaceId: spaceId,
      inputs: { triggeredBy },
      request,
    });
    return { executionId };
  }

  async cancel({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<string | null> {
    return this.workflowExecutionService.cancelLatest({
      workflowId: SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
      spaceId,
      request,
    });
  }

  async getStatus({
    spaceId,
  }: {
    spaceId: string;
  }): Promise<SignificantEventsDiscoveryStatusResult> {
    const { results } = await this.workflowExecutionService.getExecutions(
      { workflowId: SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID, size: 1 },
      spaceId
    );

    if (results.length === 0) {
      return { status: WorkflowStatus.NotStarted, executionId: null };
    }

    return mapExecutionToStatusResult(results[0]);
  }
}
