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
} from '../../../common/investigations/status';
import { MissingDismissReasonError } from './errors';

export { MissingDismissReasonError };

/**
 * Determines whether an error from `releaseGate` means the proposal was already
 * decided or expired (and should count as "skipped") or is a real failure.
 * We duck-type the error because cross-plugin error class imports are forbidden.
 */
const isProposalAlreadyDecidedOrExpired = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  // ProposalConflictError (409) and ProposalExpiredError (410) surface their HTTP
  // status on a `meta.statusCode` property.
  const anyErr = err as { meta?: { statusCode?: number } };
  const statusCode = anyErr.meta?.statusCode;
  return statusCode === 409 || statusCode === 410;
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
    spaceId: string
  ): Promise<Array<{ id: string }>> {
    const proposals = this.getProposals();
    if (!proposals) return [];

    const proposalsService = proposals.getProposalsService();
    const allProposals: Array<{ id: string }> = [];
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
        spaceId
      );
      allProposals.push(...page.proposals.map((p) => ({ id: p.id })));
      if (allProposals.length >= page.total || page.proposals.length < size) break;
      from += size;
    }

    return allProposals;
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

    const spaceId = this.getSpaceId(request);
    const pending = await this.listPendingProposals(conversationId, spaceId);
    return { pending_proposal_count: pending.length };
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
      const spaceId = this.getSpaceId(request);
      const pending = await this.listPendingProposals(conversationId, spaceId);

      if (pending.length > 0) {
        if (!body.dismiss_reason) {
          throw new MissingDismissReasonError();
        }

        const proposals = this.getProposals();
        if (proposals) {
          // assertCanManage throws a Kibana forbidden error (403) if not allowed.
          await proposals.getProposalPrivileges().assertCanManage(request);

          const proposalsService = proposals.getProposalsService();
          const results = await Promise.allSettled(
            pending.map((p) =>
              proposalsService.releaseGate(p.id, {
                approved: false,
                dismissReason: body.dismiss_reason as DismissReason,
                rationale: body.rationale,
                spaceId,
                request,
              })
            )
          );

          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const proposalId = pending[i].id;
            if (result.status === 'fulfilled') {
              dismissedProposalIds.push(proposalId);
            } else if (isProposalAlreadyDecidedOrExpired(result.reason)) {
              this.logger.debug(`Proposal ${proposalId} was already decided or expired, skipping`);
            } else {
              this.logger.error(
                `Failed to dismiss proposal ${proposalId}: ${
                  result.reason instanceof Error ? result.reason.message : String(result.reason)
                }`
              );
              failedProposalIds.push(proposalId);
            }
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
