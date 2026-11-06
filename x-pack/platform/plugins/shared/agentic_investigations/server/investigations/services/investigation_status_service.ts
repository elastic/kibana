/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { DismissReason } from '@kbn/proposals-common';
import { INVESTIGATION_TEMPLATE_ID } from '../../../common/escalations/constants';
import { WrongTemplateError } from '../../assignments/assignments_service';
import type {
  SetInvestigationStatusRequest,
  SetInvestigationStatusResponse,
  InvestigationClosePreviewResponse,
  ClosePreviewProposal,
} from '../../../common/investigations/status';
import {
  INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE,
  type InvestigationSeverityChangedEventData,
  type SetInvestigationSeverityRequest,
  type SetInvestigationSeverityResponse,
} from '../../../common/investigations/severity_change';
import { isInvestigationSeverity } from '../../../common/investigations/severity';
import { MissingDismissReasonError } from './errors';
import { CloseTargetsChangedError } from './close_targets_changed_error';
import { ProposalDismissFailedError } from './proposal_dismiss_failed_error';

export { MissingDismissReasonError, CloseTargetsChangedError, ProposalDismissFailedError };

/**
 * Checks that no pending proposal is unknown to the caller.
 *
 * Proposals that were in `expectedIds` but are no longer pending are fine — they were
 * decided or expired between preview and confirm, which is the happy path.
 *
 * Throws `CloseTargetsChangedError` when a currently-pending proposal's id was not in
 * `expectedIds`, meaning it was created (or became pending) after the dialog opened.
 *
 * When `expectedIds` is undefined the check is skipped, preserving backwards
 * compatibility with callers that don't send the field.
 */
export const assertNoUnexpectedProposals = (
  pending: Array<{ id: string }>,
  expectedIds: string[] | undefined
): void => {
  if (expectedIds === undefined) return;

  const expectedSet = new Set(expectedIds);
  const unexpected = pending.filter((p) => !expectedSet.has(p.id));
  if (unexpected.length > 0) {
    throw new CloseTargetsChangedError(
      `${unexpected.length} proposal(s) appeared after the dialog opened`
    );
  }
};

export interface InvestigationStatusServiceDeps {
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  getProposals: () => ProposalsPluginStart | undefined;
  getSpaceId: (request: KibanaRequest) => string;
  logger: Logger;
}

export class InvestigationStatusService {
  private readonly getConversationClient: InvestigationStatusServiceDeps['getConversationClient'];
  private readonly getProposals: InvestigationStatusServiceDeps['getProposals'];
  private readonly getSpaceId: InvestigationStatusServiceDeps['getSpaceId'];
  private readonly logger: Logger;

  constructor({
    getConversationClient,
    getProposals,
    getSpaceId,
    logger,
  }: InvestigationStatusServiceDeps) {
    this.getConversationClient = getConversationClient;
    this.getProposals = getProposals;
    this.getSpaceId = getSpaceId;
    this.logger = logger;
  }

  /**
   * Returns all pending (undecided, non-superseded, non-expired) proposals for a
   * conversation. Returns [] when the proposals plugin is absent or disabled.
   */
  async listPendingProposals(
    conversationId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<ClosePreviewProposal[]> {
    const proposals = this.getProposals();
    if (!proposals) return [];

    const proposalsService = proposals.getProposalsService();
    const allProposals: ClosePreviewProposal[] = [];
    let from = 0;
    const size = 100;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await proposalsService.list(
        {
          conversationId,
          status: 'pending',
          excludeSuperseded: true,
          excludeExpired: true,
          size,
          from,
        },
        spaceId,
        request
      );
      allProposals.push(
        ...page.proposals.map((p) => ({
          id: p.id,
          // Mirrors the fallback order in proposal_approval_card.tsx:196
          action_name: p.action?.name ?? p.actionWorkflowId ?? null,
        }))
      );
      if (allProposals.length >= page.total || page.proposals.length < size) break;
      from += size;
    }

    return allProposals;
  }

  /**
   * Counts the approved proposals whose action is still running (`executing`, not superseded).
   * An executing proposal keeps the deadline it was approved under, so the deadline is not
   * applied. Returns 0 when the proposals plugin is absent or disabled.
   */
  async countRunningProposals(
    conversationId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<number> {
    const proposals = this.getProposals();
    if (!proposals) return 0;

    const { total } = await proposals.getProposalsService().list(
      {
        conversationId,
        status: 'executing',
        excludeSuperseded: true,
        excludeExpired: false,
        size: 1,
        from: 0,
      },
      spaceId,
      request
    );
    return total;
  }

  /**
   * Convenience wrapper for callers that have a request but not a space ID.
   *
   * Also asserts proposal read privileges so callers don't have to do it themselves.
   * Throws `ProposalForbiddenError` (403) when the principal lacks read access.
   */
  async listPendingProposalsForRequest(
    conversationId: string,
    request: KibanaRequest
  ): Promise<ClosePreviewProposal[]> {
    const proposals = this.getProposals();
    if (proposals) {
      // assertCanRead throws ProposalForbiddenError when the principal lacks read access.
      await proposals.getProposalPrivileges().assertCanRead(request);
    }
    const spaceId = this.getSpaceId(request);
    return this.listPendingProposals(conversationId, spaceId, request);
  }

  async getPreview(
    request: KibanaRequest,
    conversationId: string
  ): Promise<InvestigationClosePreviewResponse> {
    const client = await this.getConversationClient(request);
    const conversation = await client.get(conversationId);
    if (conversation.template_id !== INVESTIGATION_TEMPLATE_ID) {
      throw new WrongTemplateError(conversationId, INVESTIGATION_TEMPLATE_ID);
    }

    const pending = await this.listPendingProposalsForRequest(conversationId, request);
    const running = await this.countRunningProposals(
      conversationId,
      this.getSpaceId(request),
      request
    );
    return {
      pending_proposal_count: pending.length,
      pending_proposals: pending,
      running_proposal_count: running,
    };
  }

  /**
   * Sets the severity a user chose and records the change on the timeline, so the agent continuing
   * the investigation sees it was a human judgement. Setting the current severity again is a no-op.
   */
  async setSeverity(
    request: KibanaRequest,
    conversationId: string,
    { severity }: SetInvestigationSeverityRequest
  ): Promise<SetInvestigationSeverityResponse> {
    const client = await this.getConversationClient(request);
    const conversation = await client.get(conversationId);
    if (conversation.template_id !== INVESTIGATION_TEMPLATE_ID) {
      throw new WrongTemplateError(conversationId, INVESTIGATION_TEMPLATE_ID);
    }

    const current = conversation.metadata?.severity;
    const previousSeverity = isInvestigationSeverity(current) ? current : undefined;
    if (previousSeverity === severity) {
      return { conversation_id: conversationId, severity, previous_severity: previousSeverity };
    }

    await client.patchMetadata(conversationId, { severity }, { access: 'converse' });

    const data: InvestigationSeverityChangedEventData = {
      severity,
      ...(previousSeverity && { previous_severity: previousSeverity }),
    };
    // Best-effort: the severity is already written, and a missing note must not fail the change.
    try {
      await client.addEvents({
        conversationId,
        events: [{ type: INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE, data }],
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record the severity change of investigation ${conversationId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return { conversation_id: conversationId, severity, previous_severity: previousSeverity };
  }

  async setStatus(
    request: KibanaRequest,
    conversationId: string,
    body: SetInvestigationStatusRequest
  ): Promise<SetInvestigationStatusResponse> {
    const client = await this.getConversationClient(request);
    const conversation = await client.get(conversationId);
    if (conversation.template_id !== INVESTIGATION_TEMPLATE_ID) {
      throw new WrongTemplateError(conversationId, INVESTIGATION_TEMPLATE_ID);
    }

    const dismissedProposalIds: string[] = [];
    const failedProposalIds: string[] = [];

    if (body.status === 'closed') {
      const pending = await this.listPendingProposalsForRequest(conversationId, request);
      const spaceId = this.getSpaceId(request);

      // Reject the close when proposals appeared after the dialog was shown, before
      // attempting any destructive operation. This also prevents the
      // "missing dismiss reason" race: a new proposal always has an unexpected id.
      assertNoUnexpectedProposals(pending, body.expected_proposal_ids);

      if (pending.length > 0) {
        if (!body.dismiss_reason) {
          throw new MissingDismissReasonError();
        }

        const proposals = this.getProposals();
        if (proposals) {
          // assertCanManage throws a Kibana forbidden error (403) if not allowed.
          await proposals.getProposalPrivileges().assertCanManage(request);

          const { released, skipped, failed } = await proposals
            .getProposalsService()
            .bulkDismiss(
              {
                ids: pending.map(({ id }) => id),
                dismissReason: body.dismiss_reason as DismissReason,
                rationale: body.rationale,
              },
              { spaceId, request }
            )
            .catch((error: unknown) => {
              // A rejection comes before any gate is released, so every one is still pending.
              this.logger.error(
                `Failed to dismiss the pending proposals of investigation ${conversationId}: ${error}`
              );
              throw new ProposalDismissFailedError(pending.map(({ id }) => id));
            });

          dismissedProposalIds.push(...released);
          for (const { id: proposalId, reason } of skipped) {
            this.logger.debug(`Proposal ${proposalId} was not dismissed (${reason}), skipping`);
          }
          for (const { id: proposalId, error } of failed) {
            this.logger.error(`Failed to dismiss proposal ${proposalId}: ${error}`);
            failedProposalIds.push(proposalId);
          }

          // Do not mark the investigation closed when proposals could not be dismissed.
          // The caller can retry: proposals that were dismissed are no longer pending,
          // so the next attempt only needs to handle the remaining ones.
          if (failedProposalIds.length > 0) {
            throw new ProposalDismissFailedError(failedProposalIds);
          }
        }
      }
    }

    const { conversation: updated } = await client.patchMetadata(
      conversationId,
      { status: body.status },
      { access: 'converse' }
    );

    return {
      conversation_id: updated.id,
      status: body.status,
      dismissed_proposal_ids: dismissedProposalIds,
      failed_proposal_ids: failedProposalIds,
    };
  }
}
