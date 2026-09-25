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
import { MissingDismissReasonError } from './errors';
import { CloseTargetsChangedError } from './close_targets_changed_error';
import { ProposalDismissFailedError } from './proposal_dismiss_failed_error';

export { MissingDismissReasonError, CloseTargetsChangedError, ProposalDismissFailedError };

/**
 * Determines how to classify a `releaseGate` failure for a single proposal.
 *
 * - `ProposalExpiredError` or `ProposalNotFoundError` → the proposal is gone; skip it.
 * - `ProposalConflictError` → ambiguous: could be "already decided" (skippable) or an OCC /
 *   execution race where the proposal is still `pending` (retry-able). We re-read the proposal
 *   to find out.
 * - Anything else → treat as a real failure.
 *
 * We match by `error.name` because cross-plugin class imports are forbidden and the proposals
 * plugin sets `this.name` explicitly on every custom error.
 *
 * @returns
 *   - `'skipped'` — the proposal was already decided, expired, or not found
 *   - `'retry'`   — a conflict but the proposal is still pending; caller should retry once
 *   - `'failed'`  — a non-recoverable failure
 */
async function classifyReleaseGateError(
  err: unknown,
  proposalId: string,
  proposalsService: {
    get: (
      id: string,
      spaceId: string
    ) => Promise<{ decision?: unknown; status: string; expired: boolean }>;
  },
  spaceId: string
): Promise<'skipped' | 'retry' | 'failed'> {
  if (!(err instanceof Error)) return 'failed';

  if (err.name === 'ProposalExpiredError' || err.name === 'ProposalNotFoundError') {
    return 'skipped';
  }

  if (err.name === 'ProposalConflictError') {
    // Re-read the proposal to determine its actual state.
    let proposal: { decision?: unknown; status: string; expired: boolean };
    try {
      proposal = await proposalsService.get(proposalId, spaceId);
    } catch (readErr) {
      if (readErr instanceof Error && readErr.name === 'ProposalNotFoundError') {
        return 'skipped';
      }
      return 'failed';
    }
    const isSettled =
      proposal.decision !== undefined || proposal.status !== 'pending' || proposal.expired;
    return isSettled ? 'skipped' : 'retry';
  }

  return 'failed';
}

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
    spaceId: string
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
        spaceId
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
    return this.listPendingProposals(conversationId, spaceId);
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
    return { pending_proposal_count: pending.length, pending_proposals: pending };
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

          const proposalsService = proposals.getProposalsService();
          const releaseParams = {
            approved: false as const,
            dismissReason: body.dismiss_reason as DismissReason,
            rationale: body.rationale,
            spaceId,
            request,
          };

          const dismissOutcomes = await Promise.all(
            pending.map(async (p) => {
              try {
                await proposalsService.releaseGate(p.id, releaseParams);
                return { id: p.id, outcome: 'dismissed' as const };
              } catch (firstErr) {
                const classification = await classifyReleaseGateError(
                  firstErr,
                  p.id,
                  proposalsService,
                  spaceId
                );
                if (classification === 'skipped') {
                  return { id: p.id, outcome: 'skipped' as const };
                }
                if (classification === 'retry') {
                  // Proposal is still pending — retry once.
                  try {
                    await proposalsService.releaseGate(p.id, releaseParams);
                    return { id: p.id, outcome: 'dismissed' as const };
                  } catch {
                    return { id: p.id, outcome: 'failed' as const };
                  }
                }
                return { id: p.id, outcome: 'failed' as const };
              }
            })
          );

          for (const { id: proposalId, outcome } of dismissOutcomes) {
            if (outcome === 'dismissed') {
              dismissedProposalIds.push(proposalId);
            } else if (outcome === 'skipped') {
              this.logger.debug(`Proposal ${proposalId} was already decided or expired, skipping`);
            } else {
              this.logger.error(`Failed to dismiss proposal ${proposalId}`);
              failedProposalIds.push(proposalId);
            }
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
