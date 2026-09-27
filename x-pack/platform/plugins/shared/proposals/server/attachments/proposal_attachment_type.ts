/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { ProposalAttachmentData, ProposalWithMetadata } from '@kbn/proposals-common';
import { PROPOSAL_ATTACHMENT_TYPE, proposalAttachmentDataSchema } from '@kbn/proposals-common';
import type { ProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import type { ProposalsService } from '../services/proposals_service';

export interface ProposalAttachmentTypeDeps {
  getProposalsService: () => ProposalsService;
  privileges: ProposalPrivilegesChecker;
  logger: Logger;
}

/**
 * Where the decision stands, as the agent needs to understand it.
 *
 * Expiry is reported by the banner instead: an expired proposal has no decision
 * to report, and `Decision: pending` underneath `EXPIRED` told the agent one was
 * still coming. That is reachable on every read now that `expired` is evaluated
 * live rather than snapshotted when the attachment was written.
 */
const describeOutcome = (proposal: ProposalWithMetadata, isExpired: boolean): string => {
  if (isExpired) {
    return '';
  }
  if (proposal.status === 'pending') {
    return 'Awaiting a human decision. Do not attempt to approve or dismiss this proposal yourself.';
  }
  return `Decision: ${proposal.status}${
    proposal.decidedBy?.username ? ` by ${proposal.decidedBy.username}` : ''
  }`;
};

/**
 * Format a proposal for the LLM.  Keep it terse: the human decision is the
 * only action the agent can request — it cannot run the action itself.
 */
const formatProposalForAgent = (proposal: ProposalWithMetadata): string => {
  // Deliberately NOT `PROPOSAL_WITHOUT_ACTION_LABEL`: this string is LLM prompt input
  // and must stay untranslated and carry the analyst-directive clause. The UI badge
  // ("No automated action") lives in public/translations.ts.
  const label =
    proposal.action?.name ??
    proposal.actionWorkflowId ??
    'No automated action — analyst carries this out themselves';

  // Both, because they can disagree: `expired` is the deadline evaluated on
  // read, while `status: 'expired'` is the settlement the gate writes when
  // nobody answered — which it can do before the deadline itself passes.
  const isExpired = proposal.expired || proposal.status === 'expired';

  const lines: string[] = [
    `## Proposal: ${label}`,
    `Status: ${proposal.status}`,
    // Not "the deadline has passed": the gate can settle a proposal as expired
    // before its deadline, and `Decision deadline` below would then print a
    // future date directly under a banner claiming it was behind us.
    isExpired ? 'EXPIRED: this proposal can no longer be decided.' : '',
    '',
    proposal.comment,
    '',
    `Impact: ${proposal.impact} | Confidence: ${proposal.confidence} | Category: ${
      proposal.action?.category ?? proposal.category ?? 'unknown'
    }`,
    proposal.action?.reversible !== undefined
      ? `Reversible: ${proposal.action.reversible ? 'yes' : 'no'}`
      : '',
    proposal.expiresAt ? `Decision deadline: ${proposal.expiresAt}` : '',
    '',
    describeOutcome(proposal, isExpired),
  ];

  return lines.filter((l) => l !== '').join('\n');
};

/**
 * Server-side attachment type definition for proposals.
 *
 * `isReadonly: true` prevents the agent from creating or updating proposal
 * attachments with `attachment_add` / `attachment_update` — they are created
 * exclusively by the proposals API.
 */
export const createProposalAttachmentType = ({
  getProposalsService,
  privileges,
  logger,
}: ProposalAttachmentTypeDeps): AttachmentTypeDefinition<
  typeof PROPOSAL_ATTACHMENT_TYPE,
  ProposalAttachmentData
> => ({
  id: PROPOSAL_ATTACHMENT_TYPE,

  isReadonly: true,

  validate: (input) => {
    const result = proposalAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  // Read at representation time rather than at add time, so what the agent is
  // told matches what the analyst sees. `origin` first because attachments
  // written before the payload shrank carry the id only there.
  format: (attachment, { request, spaceId }) => ({
    getRepresentation: async () => {
      const proposalId = attachment.origin ?? attachment.data.proposalId;
      try {
        // The service reads as the internal user, so nothing below this line
        // enforces the caller's own privileges. Attachments of this type are
        // `isReadonly`, but that only stops the agent's attachment tools — the
        // public attachment API still lets any caller name an arbitrary
        // proposal id here, which without this check would read it back to the
        // LLM for someone holding no proposals privilege at all.
        await privileges.assertCanRead(request);
        const proposal = await getProposalsService().get(proposalId, spaceId, request);
        return { type: 'text', value: formatProposalForAgent(proposal) };
      } catch (error) {
        logger.warn(`Failed to read proposal ${proposalId} for its attachment: ${error}`);
        // Same text whether the proposal is missing or merely off-limits, so
        // the representation cannot be used to probe for ids.
        return { type: 'text', value: '## Proposal: currently unavailable' };
      }
    },
  }),

  getAgentDescription: () =>
    'A proposal is a structured recommendation from an agent that requires a human decision ' +
    'before any action is taken.\n\n' +
    'Rules:\n' +
    "- Never approve, dismiss, or re-create a proposal yourself — that is exclusively the analyst's decision.\n" +
    '- Whenever you mention or summarise a proposal in your response, render it inline with ' +
    '`<render_attachment id="ATTACHMENT_ID" />` (replace ATTACHMENT_ID with the actual id) so ' +
    'the analyst can act on it directly in the chat.\n' +
    '- If the proposal is expired or already decided, say so in your response but still render the card.',
});
