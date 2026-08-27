/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ExecutionStatus } from '@kbn/workflows';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import type {
  GetInvestigationResponse,
  InvestigationStatus,
  InvestigationSubject,
  InvestigationTriggerType,
  ListInvestigationsRequest,
  ListInvestigationsResponse,
  UpdatableInvestigationStatus,
  StartInvestigationRequest,
  StartInvestigationResponse,
} from '../../common';
import { DEFAULT_INVESTIGATION_TRIGGER_TYPE } from '../../common';
import type {
  InvestigationSavedObjectClient,
  InvestigationSavedObjectUpdateAttributes,
  InvestigationStructuredOutput,
} from '../saved_objects';
import type { NightshiftInvestigationAttributes } from '../saved_objects';

import { InvestigationNotFoundError } from './errors';
import { InvestigationUnavailableError } from './investigation_unavailable_error';
export { InvestigationNotFoundError, InvestigationUnavailableError };

export interface UpdateInvestigationRequest extends InvestigationStructuredOutput {
  status: UpdatableInvestigationStatus;
  error?: string;
}

function toInvestigationResponse(
  id: string,
  attrs: NightshiftInvestigationAttributes
): GetInvestigationResponse {
  return {
    investigation_id: id,
    subject: { type: attrs.subject_type, id: attrs.subject_id },
    trigger_type: attrs.trigger_type,
    status: attrs.status,
    started_at: attrs.created_at,
    completed_at: attrs.completed_at,
    concurrency_key: attrs.concurrency_key,
    executed_by: attrs.executed_by,
    error: attrs.error,
    summary: attrs.summary,
    conclusion: attrs.conclusion,
    hypotheses: attrs.hypotheses,
    recommendations: attrs.recommendations,
    blind_spots: attrs.blind_spots,
    significant_event_updates: attrs.significant_event_updates,
  };
}

function toInvestigationStatus(status: ExecutionStatus, logger: Logger): InvestigationStatus {
  switch (status) {
    case ExecutionStatus.PENDING:
    case ExecutionStatus.QUEUED:
      return 'pending';
    case ExecutionStatus.RUNNING:
    case ExecutionStatus.WAITING:
    case ExecutionStatus.WAITING_FOR_INPUT:
    case ExecutionStatus.WAITING_FOR_CHILD:
      return 'running';
    case ExecutionStatus.COMPLETED:
      return 'completed';
    case ExecutionStatus.FAILED:
    case ExecutionStatus.TIMED_OUT:
      return 'failed';
    case ExecutionStatus.CANCELLED:
    case ExecutionStatus.SKIPPED:
      return 'cancelled';
    default: {
      // TypeScript will error here if a new ExecutionStatus value is added without a case above.
      const _exhaustiveCheck: never = status;
      logger.warn(
        `Unknown workflow ExecutionStatus "${_exhaustiveCheck}" for investigation, treating as running`
      );
      return 'running';
    }
  }
}

function isTerminalStatus(status: InvestigationStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export interface NightshiftInvestigationsClientDeps {
  request: KibanaRequest;
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
  logger: Logger;
  spaceIdOverride?: string;
  agentBuilder?: AgentBuilderPluginStart;
  investigationSoClient: InvestigationSavedObjectClient;
  security?: CoreStart['security'];
}

export class NightshiftInvestigationsClient {
  private readonly request: KibanaRequest;
  private readonly workflowsManagement: WorkflowsServerPluginSetup | undefined;
  private readonly spaces: SpacesPluginStart | undefined;
  private readonly logger: Logger;
  private readonly spaceIdOverride?: string;
  private readonly agentBuilder?: AgentBuilderPluginStart;
  private readonly investigationSoClient: InvestigationSavedObjectClient;
  private readonly security?: CoreStart['security'];

  constructor(deps: NightshiftInvestigationsClientDeps) {
    this.request = deps.request;
    this.workflowsManagement = deps.workflowsManagement;
    this.spaces = deps.spaces;
    this.logger = deps.logger;
    this.spaceIdOverride = deps.spaceIdOverride;
    this.agentBuilder = deps.agentBuilder;
    this.investigationSoClient = deps.investigationSoClient;
    this.security = deps.security;
  }

  private getSpaceId(): string {
    return (
      this.spaceIdOverride ??
      this.spaces?.spacesService.getSpaceId(this.request) ??
      DEFAULT_SPACE_ID
    );
  }

  private getCurrentUsername(): string | undefined {
    return this.security?.authc.getCurrentUser(this.request)?.username;
  }

  async start({
    subject,
    trigger_type,
    message,
    stream_names,
    concurrency_key,
    context,
  }: StartInvestigationRequest): Promise<StartInvestigationResponse> {
    if (!this.workflowsManagement) {
      throw new InvestigationUnavailableError('workflowsManagement is not available');
    }

    if (!this.agentBuilder) {
      throw new InvestigationUnavailableError('agentBuilder is not available');
    }

    const spaceId = this.getSpaceId();

    await installInvestigationAgent({ agentBuilder: this.agentBuilder, spaceId });

    const workflow = await this.workflowsManagement.management.getWorkflow(
      SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
      spaceId
    );

    if (!workflow?.definition) {
      this.logger.error(
        `Investigation workflow "${SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID}" is not installed in space "${spaceId}"`
      );
      throw new InvestigationUnavailableError('Investigations are not configured in this space');
    }

    const inputs = {
      message: message ?? `Investigation requested for ${subject.type} ${subject.id}`,
      stream_names: stream_names ?? [],
      ...(concurrency_key ? { concurrency_key } : {}),
      context: {
        ...context,
        source: subject.type,
        [`${subject.type}_id`]: subject.id,
        trigger_type: trigger_type ?? DEFAULT_INVESTIGATION_TRIGGER_TYPE,
      },
    };

    const executionId = await this.workflowsManagement.management.runWorkflow(
      { ...workflow, definition: workflow.definition },
      spaceId,
      inputs,
      this.request,
      'nightshift-investigations'
    );

    this.logger.info(
      `Started investigation for ${subject.type}/${subject.id}, execution_id=${executionId}`
    );

    await this.createInvestigationSavedObject({
      executionId,
      subject,
      trigger_type: trigger_type ?? DEFAULT_INVESTIGATION_TRIGGER_TYPE,
      concurrency_key,
    });

    return { investigation_id: executionId };
  }

  private async createInvestigationSavedObject({
    executionId,
    subject,
    trigger_type,
    concurrency_key,
  }: {
    executionId: string;
    subject: InvestigationSubject;
    trigger_type: InvestigationTriggerType;
    concurrency_key?: string;
  }): Promise<void> {
    if (concurrency_key) {
      await this.cancelSupersededInvestigation({ concurrency_key });
    }

    await this.investigationSoClient.create({
      id: executionId,
      attributes: {
        investigation_id: executionId,
        status: 'running',
        subject_type: subject.type,
        subject_id: subject.id,
        trigger_type,
        concurrency_key,
        executed_by: this.getCurrentUsername(),
        created_at: new Date().toISOString(),
      },
    });
  }

  private async cancelSupersededInvestigation({
    concurrency_key,
  }: {
    concurrency_key: string;
  }): Promise<void> {
    const superseded = await this.investigationSoClient.findByConcurrencyKey(concurrency_key);

    if (superseded && !isTerminalStatus(superseded.attributes.status)) {
      await this.investigationSoClient.update(superseded.id, {
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      });
    }
  }

  async update(investigationId: string, state: UpdateInvestigationRequest): Promise<void> {
    const { status, error, ...output } = state;

    const attrs: InvestigationSavedObjectUpdateAttributes = {
      status,
      ...(isTerminalStatus(status) && { completed_at: new Date().toISOString() }),
      ...(error !== undefined && { error }),
      ...output,
    };

    await this.investigationSoClient.update(investigationId, attrs);
  }

  async get(investigationId: string): Promise<GetInvestigationResponse> {
    const soAttrs = await this.investigationSoClient.get(investigationId);

    if (!soAttrs) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const response = toInvestigationResponse(investigationId, soAttrs);

    if (soAttrs.status === 'running') {
      const reconciled = await this.reconcileStaleRunningStatus(investigationId);
      if (reconciled) {
        response.status = reconciled.status;
        response.completed_at = reconciled.completed_at;
        response.error = reconciled.error;
      }
    }

    return response;
  }

  private async reconcileStaleRunningStatus(
    investigationId: string
  ): Promise<{ status: InvestigationStatus; completed_at?: string; error?: string } | undefined> {
    if (!this.workflowsManagement) {
      return undefined;
    }

    const spaceId = this.getSpaceId();
    const execution = await this.workflowsManagement.management.getWorkflowExecution(
      investigationId,
      spaceId,
      { includeOutput: false }
    );

    if (!execution) {
      return undefined;
    }

    const workflowStatus = toInvestigationStatus(execution.status, this.logger);
    if (!isTerminalStatus(workflowStatus)) {
      return undefined;
    }

    const correction: InvestigationSavedObjectUpdateAttributes = {
      status: workflowStatus,
      completed_at: execution.finishedAt ?? new Date().toISOString(),
      ...(workflowStatus === 'failed' && { error: 'Investigation failed' }),
    };

    await this.investigationSoClient.update(investigationId, correction).catch((err) => {
      this.logger.warn(
        `Failed to reconcile stale SO status for investigation "${investigationId}": ${err.message}`
      );
    });

    return {
      status: workflowStatus,
      completed_at: correction.completed_at,
      error: correction.error,
    };
  }

  async list({
    statuses,
    started_after,
    started_before,
    finished_after,
    finished_before,
    sort_field,
    sort_order,
    page = 1,
    size = 20,
  }: ListInvestigationsRequest = {}): Promise<ListInvestigationsResponse> {
    const result = await this.investigationSoClient.find({
      statuses,
      createdAfter: started_after,
      createdBefore: started_before,
      completedAfter: finished_after,
      completedBefore: finished_before,
      sortField: sort_field === 'finished_at' ? 'completed_at' : 'created_at',
      sortOrder: sort_order,
      page,
      perPage: size,
    });

    const results = result.results.map((so) => toInvestigationResponse(so.id, so.attributes));

    return { results, page: result.page, size: result.size, total: result.total };
  }
}
