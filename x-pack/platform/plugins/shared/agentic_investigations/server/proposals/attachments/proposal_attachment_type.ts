/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { ProposalAttachmentData, ProposalWithMetadata } from '../../../common/proposals';
import { PROPOSAL_ATTACHMENT_TYPE, proposalAttachmentDataSchema } from '../../../common/proposals';
import type { ProposalsService } from '../services/proposals_service';

export interface ProposalAttachmentTypeDeps {
  getProposalsService: () => ProposalsService;
  logger: Logger;
}

/**
 * Format a proposal for the LLM.  Keep it terse: the human decision is the
 * only action the agent can request — it cannot run the action itself.
 */
const formatProposalForAgent = (proposal: ProposalWithMetadata): string => {
  // Deliberately NOT `PROPOSAL_WITHOUT_ACTION_LABEL`: this string is LLM prompt input
  // and must stay untranslated and carry the analyst-directive clause. The UI badge
  // ("No automated action") lives in public/proposals/translations.ts.
  const label =
    proposal.action?.name ??
    proposal.actionWorkflowId ??
    'No automated action — analyst carries this out themselves';

  const lines: string[] = [
    `## Investigation proposal: ${label}`,
    `Status: ${proposal.status}`,
    proposal.expired ? 'EXPIRED: the decision deadline has passed' : '',
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
    proposal.status === 'pending' && !proposal.expired
      ? 'Awaiting a human decision. Do not attempt to approve or dismiss this proposal yourself.'
      : `Decision: ${proposal.status}${
          proposal.decidedBy?.username ? ` by ${proposal.decidedBy.username}` : ''
        }`,
  ];

  return lines.filter((l) => l !== '').join('\n');
};

/**
 * Server-side attachment type definition for investigation proposals.
 *
 * `isReadonly: true` prevents the agent from creating or updating proposal
 * attachments with `attachment_add` / `attachment_update` — they are created
 * exclusively by the proposals API.
 */
export const createProposalAttachmentType = ({
  getProposalsService,
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
  format: (attachment, { spaceId }) => ({
    getRepresentation: async () => {
      const proposalId = attachment.origin ?? attachment.data.proposalId;
      try {
        const proposal = await getProposalsService().get(proposalId, spaceId);
        return { type: 'text', value: formatProposalForAgent(proposal) };
      } catch (error) {
        logger.warn(`Failed to read proposal ${proposalId} for its attachment: ${error}`);
        return { type: 'text', value: '## Investigation proposal: currently unavailable' };
      }
    },
  }),

  getAgentDescription: () =>
    'An investigation proposal is a structured recommendation from the security agent that ' +
    'requires a human decision before any action is taken.\n\n' +
    'Rules:\n' +
    "- Never approve, dismiss, or re-create a proposal yourself — that is exclusively the analyst's decision.\n" +
    '- Whenever you mention or summarise a proposal in your response, render it inline with ' +
    '`<render_attachment id="ATTACHMENT_ID" />` (replace ATTACHMENT_ID with the actual id) so ' +
    'the analyst can act on it directly in the chat.\n' +
    '- If the proposal is expired or already decided, say so in your response but still render the card.',
});
