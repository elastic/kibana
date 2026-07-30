/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { type SignificantEventsWorkflowStatusResult } from '@kbn/significant-events-schema';
import { WorkflowExecutionService } from './workflow_execution_service';

interface CodeExtractionWorkflowInputPayload {
  /** Connector for the code-intelligence agent steps. Omitted -> YAML default. */
  agentConnectorId?: string;
}

export interface CodeExtractionRunParams {
  request: KibanaRequest;
  spaceId: string;
  inputs?: CodeExtractionWorkflowInputPayload;
  onBeforeStart?: () => void;
}

/**
 * Triggers the managed "Continuous Code KI Extraction" workflow. The workflow
 * uses `ai.agent` steps (the code-intelligence agent) to enumerate deployable
 * services and their logging sites across the indexed repositories, then fans out to the per-service
 * `_identify_service` endpoint. Runs are singleton per space: a non-terminal
 * execution is reused rather than starting a duplicate.
 */
export class SignificantEventsCodeExtractionClient {
  private readonly workflowExecutionService: WorkflowExecutionService<CodeExtractionWorkflowInputPayload>;

  constructor({ managementApi }: { managementApi: WorkflowsServerPluginSetup['management'] }) {
    this.workflowExecutionService = new WorkflowExecutionService({
      managementApi,
      workflowId: SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID,
      workflowSpaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
  }

  async run({ request, spaceId, inputs, onBeforeStart }: CodeExtractionRunParams): Promise<{
    executionId: string;
    isNew: boolean;
  }> {
    const lastExecution = await this.workflowExecutionService.getLastExecution(spaceId);
    if (lastExecution && !isTerminalStatus(lastExecution.status)) {
      return { executionId: lastExecution.id, isNew: false };
    }

    onBeforeStart?.();
    const executionId = await this.workflowExecutionService.execute({
      executionSpaceId: spaceId,
      inputs: inputs?.agentConnectorId ? { agentConnectorId: inputs.agentConnectorId } : {},
      request,
    });
    return { executionId, isNew: true };
  }

  async getStatus({
    spaceId,
  }: {
    spaceId: string;
  }): Promise<SignificantEventsWorkflowStatusResult> {
    return this.workflowExecutionService.getStatus({ spaceId });
  }
}
