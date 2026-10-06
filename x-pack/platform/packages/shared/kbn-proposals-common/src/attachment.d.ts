import { z } from '@kbn/zod/v4';
/** Attachment type identifier registered with Agent Builder. */
export declare const PROPOSAL_ATTACHMENT_TYPE: 'platform.proposal';
/**
 * A pointer, not a copy. The proposal is the only source of truth, so both the
 * card and the agent read it at display time — anything snapshotted here would
 * still say "pending" after the analyst had decided.
 */
export declare const proposalAttachmentDataSchema: z.ZodObject<{
    proposalId: z.ZodString;
    title: z.ZodString;
}, z.core.$strip>;
export type ProposalAttachmentData = z.infer<typeof proposalAttachmentDataSchema>;
