/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { INVESTIGATION_TEMPLATE_ID } from '../../../common/investigations/constants';
import type {
  CloseInvestigationRequest,
  CloseInvestigationResponse,
  UpdateAssigneesRequest,
  UpdateAssigneesResponse,
} from '../../../common/investigations/investigation';
import type { ProposalsService } from '../../proposals/services/proposals_service';
import { NotAnInvestigationError, UnknownAssigneesError } from './errors';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export interface InvestigationsServiceDeps {
  logger: Logger;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  /** Used to validate that assignee profile UIDs exist. */
  userProfile: CoreStart['userProfile'];
  getProposalsService: () => ProposalsService;
  getWorkflowsApi: () => WorkflowsManagementApi;
}

export class InvestigationsService {
  private readonly logger: Logger;
  private readonly getConversationClient: (
    request: KibanaRequest
  ) => Promise<ConversationPublicClient>;
  private readonly userProfile: CoreStart['userProfile'];
  private readonly getProposalsService: () => ProposalsService;
  private readonly getWorkflowsApi: () => WorkflowsManagementApi;

  constructor({
    logger,
    getConversationClient,
    userProfile,
    getProposalsService,
    getWorkflowsApi,
  }: InvestigationsServiceDeps) {
    this.logger = logger;
    this.getConversationClient = getConversationClient;
    this.userProfile = userProfile;
    this.getProposalsService = getProposalsService;
    this.getWorkflowsApi = getWorkflowsApi;
  }

  /**
   * Replace the assignees on an investigation conversation.
   *
   * Validates that:
   * - The conversation exists and is an investigation.
   * - Every supplied assignee profile uid exists in Kibana.
   *
   * Overwrite semantics: the supplied list fully replaces whatever is stored.
   * An empty array removes all assignees.
   */
  async updateAssignees(
    request: KibanaRequest,
    investigationId: string,
    body: UpdateAssigneesRequest
  ): Promise<UpdateAssigneesResponse> {
    const client = await this.getConversationClient(request);

    const current = await client.get(investigationId);
    if (current.template_id !== INVESTIGATION_TEMPLATE_ID) {
      throw new NotAnInvestigationError(investigationId);
    }

    if (body.assignees.length > 0) {
      await this.validateAssignees(body.assignees);
    }

    this.logger.debug(
      `Updating assignees for investigation "${investigationId}" to [${body.assignees.join(', ')}]`
    );

    const { conversation } = await client.patchMetadata(investigationId, {
      assignees: body.assignees,
    });

    const stored = conversation.metadata?.assignees;
    return { assignees: Array.isArray(stored) ? (stored as string[]) : [] };
  }

  /**
   * Close an investigation.
   *
   * Order of writes is intentional: status is patched first so that a workflow
   * observing `metadata.status` can self-terminate even if the cancellation call
   * below fails. Proposal declinations are best-effort (failures are logged and
   * skipped) to avoid rolling back an already-written close.
   */
  async close(
    request: KibanaRequest,
    investigationId: string,
    body: CloseInvestigationRequest,
    spaceId: string
  ): Promise<CloseInvestigationResponse> {
    const client = await this.getConversationClient(request);

    const current = await client.get(investigationId);
    if (current.template_id !== INVESTIGATION_TEMPLATE_ID) {
      throw new NotAnInvestigationError(investigationId);
    }

    const { conversation: closed } = await client.patchMetadata(investigationId, {
      status: 'closed',
      close_reason: body.closeReason,
    });

    const declinedProposalCount = await this.declinePendingProposals(
      request,
      investigationId,
      spaceId
    );

    const workflowExecutionId = closed.metadata?.workflow_execution_id;
    const workflowCancelled =
      typeof workflowExecutionId === 'string' && workflowExecutionId.length > 0
        ? await this.cancelWorkflow(workflowExecutionId, spaceId, request)
        : false;

    return { status: 'closed', declinedProposalCount, workflowCancelled };
  }

  /** Decline all pending proposals for the investigation. Returns number declined. */
  private async declinePendingProposals(
    request: KibanaRequest,
    investigationId: string,
    spaceId: string
  ): Promise<number> {
    const proposalsService = this.getProposalsService();
    const { proposals } = await proposalsService.list(
      { conversationId: investigationId, status: 'pending', size: 100, from: 0 },
      spaceId
    );

    let declined = 0;
    for (const proposal of proposals) {
      try {
        await proposalsService.releaseGate(proposal.id, {
          approved: false,
          dismissReason: 'already_handled',
          rationale: 'Investigation closed',
          spaceId,
          request,
        });
        declined++;
      } catch (error) {
        this.logger.warn(
          `Failed to decline proposal "${
            proposal.id
          }" while closing investigation "${investigationId}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return declined;
  }

  /** Cancel the investigation's workflow execution. Returns true when the cancel succeeded. */
  private async cancelWorkflow(
    workflowExecutionId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<boolean> {
    const api = this.getWorkflowsApi();
    try {
      const execution = await api.getWorkflowExecution(workflowExecutionId, spaceId);
      if (!execution || execution.finishedAt) {
        return false;
      }
      await api.cancelWorkflowExecution(workflowExecutionId, spaceId, request);
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to cancel workflow execution "${workflowExecutionId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  }

  /**
   * Verifies that every profile uid in the list resolves to a real user.
   * Throws UnknownAssigneesError listing the unknown ones.
   */
  private async validateAssignees(assignees: string[]): Promise<void> {
    const uids = new Set(assignees);
    const profiles = await this.userProfile.bulkGet({ uids });
    const foundUids = new Set(profiles.map((p) => p.uid));
    const unknown = assignees.filter((uid) => !foundUids.has(uid));

    if (unknown.length > 0) {
      throw new UnknownAssigneesError(unknown);
    }
  }
}
