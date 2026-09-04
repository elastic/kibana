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
import {
  getCodeExtractionRunDetails,
  type CodeExtractionRunDetails,
} from './code_extraction_run_status';
import { CodeExtractionScopeConflictError } from './code_extraction_scope_conflict_error';
import { WorkflowExecutionService } from './workflow_execution_service';

interface CodeExtractionWorkflowInputPayload {
  /** Connector for the code-intelligence agent steps. Omitted -> YAML default. */
  agentConnectorId?: string;
  /** Exact Codebox repository to process. Omitted -> all indexed repositories. */
  repository?: string;
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
 * `_identify_service` endpoint. The managed definition enforces an atomic
 * per-space concurrency group; this client also reuses an observed active run
 * to avoid unnecessary dropped executions.
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
      const activeExecution = await this.workflowExecutionService.getExecution({
        id: lastExecution.id,
        spaceId,
        options: { includeInput: true },
      });
      const activeInputs = activeExecution?.context?.inputs;
      const activeRepositoryInput =
        typeof activeInputs === 'object' && activeInputs !== null && 'repository' in activeInputs
          ? activeInputs.repository
          : undefined;
      const activeRepository =
        typeof activeRepositoryInput === 'string' && activeRepositoryInput.length > 0
          ? activeRepositoryInput
          : undefined;
      const requestedRepository = inputs?.repository;
      if (activeRepository === requestedRepository) {
        return { executionId: lastExecution.id, isNew: false };
      }
      throw new CodeExtractionScopeConflictError(
        `Code Intelligence extraction is already running for ${
          activeRepository ? `repository "${activeRepository}"` : 'all repositories'
        }.`
      );
    }

    onBeforeStart?.();
    const executionId = await this.workflowExecutionService.execute({
      executionSpaceId: spaceId,
      inputs: {
        ...(inputs?.agentConnectorId ? { agentConnectorId: inputs.agentConnectorId } : {}),
        ...(inputs?.repository ? { repository: inputs.repository } : {}),
      },
      request,
    });
    return { executionId, isNew: true };
  }

  async isInstalled(): Promise<boolean> {
    return this.workflowExecutionService.isInstalled();
  }

  async getStatus({
    spaceId,
    executionId,
    details = false,
  }: {
    spaceId: string;
    executionId?: string;
    details?: boolean;
  }): Promise<SignificantEventsWorkflowStatusResult & { details?: CodeExtractionRunDetails }> {
    const status = await this.workflowExecutionService.getStatus({ spaceId, executionId });
    if (!details || !status.executionId) {
      return details ? { ...status, details: getCodeExtractionRunDetails(null) } : status;
    }

    const execution = await this.workflowExecutionService.getExecution({
      id: status.executionId,
      spaceId,
      options: { includeInput: true, includeOutput: true },
    });
    return { ...status, details: getCodeExtractionRunDetails(execution) };
  }
}
