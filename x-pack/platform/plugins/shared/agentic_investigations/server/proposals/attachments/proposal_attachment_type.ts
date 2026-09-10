/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { actionCategorySchema, actionImpactSchema } from '@kbn/workflows';
import { PROPOSAL_ATTACHMENT_TYPE, proposalSchema } from '../../../common/proposals';

/** Snapshot stored inside the attachment, mirroring `ProposalWithMetadata`. */
const proposalAttachmentDataSchema = proposalSchema.extend({
  action: z
    .object({
      name: z.string(),
      impact: actionImpactSchema,
      category: actionCategorySchema,
      reversible: z.boolean().optional(),
    })
    .optional(),
  expired: z.boolean(),
});

type ProposalAttachmentData = z.infer<typeof proposalAttachmentDataSchema>;

/**
 * Format a proposal for the LLM.  Keep it terse: the human decision is the
 * only action the agent can request — it cannot run the action itself.
 */
const formatProposalForAgent = (data: ProposalAttachmentData): string => {
  const label =
    data.action?.name ??
    data.actionWorkflowId ??
    'No automated action — analyst carries this out themselves';

  const lines: string[] = [
    `## Investigation proposal: ${label}`,
    `Status: ${data.status}`,
    data.expired ? 'EXPIRED: the decision deadline has passed' : '',
    '',
    data.comment,
    '',
    `Impact: ${data.impact} | Confidence: ${data.confidence} | Category: ${
      data.action?.category ?? data.category ?? 'unknown'
    }`,
    data.action?.reversible !== undefined
      ? `Reversible: ${data.action.reversible ? 'yes' : 'no'}`
      : '',
    data.expiresAt ? `Decision deadline: ${data.expiresAt}` : '',
    '',
    data.status === 'pending' && !data.expired
      ? 'Awaiting a human decision. Do not attempt to approve or dismiss this proposal yourself.'
      : `Decision: ${data.status}${
          data.decidedBy?.username ? ` by ${data.decidedBy.username}` : ''
        }`,
  ];

  return lines.filter((l) => l !== '').join('\n');
};

/**
 * Server-side attachment type definition for investigation proposals.
 *
 * `isReadonly: true` prevents the agent from creating or updating proposal
 * attachments with `attachment_add` / `attachment_update` — they are created
 * exclusively by the proposals API. The HTTP create route is unaffected, so
 * the seed script can still add by-value attachments directly.
 */
export const proposalAttachmentType: AttachmentTypeDefinition = {
  id: PROPOSAL_ATTACHMENT_TYPE,

  isReadonly: true,

  validate: (input) => {
    const result = proposalAttachmentDataSchema.safeParse(input);
    // eslint-disable-next-line no-console
    console.log('[proposal_attachment] validate input:', JSON.stringify(input, null, 2));
    if (result.success) {
      // eslint-disable-next-line no-console
      console.log('[proposal_attachment] validate OK, id:', result.data.id);
      return { valid: true, data: result.data };
    }
    // eslint-disable-next-line no-console
    console.error('[proposal_attachment] validate FAILED:', result.error.message);
    return { valid: false, error: result.error.message };
  },

  format: (attachment) => ({
    getRepresentation: () => {
      const value = formatProposalForAgent(attachment.data as ProposalAttachmentData);
      // eslint-disable-next-line no-console
      console.log('[proposal_attachment] format output:\n', value);
      return { type: 'text', value };
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
};
