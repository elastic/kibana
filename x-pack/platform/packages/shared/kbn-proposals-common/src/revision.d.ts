import { z } from '@kbn/zod/v4';
/**
 * Fields an analyst may override when revising. Excludes `actionWorkflowId`
 * (the existing `actionInput` was validated against the original action's
 * schema) and `expiresAt`/`createdAt`, so repeated revisions cannot extend a
 * near-expired proposal indefinitely.
 *
 * `origin` is absent for a different reason: it names the system that produced
 * the chain, which a revision does not change.
 */
export declare const reviseProposalRequestSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    comment: z.ZodOptional<z.ZodString>;
    actionInput: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    impact: z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        high: "high";
        low: "low";
        medium: "medium";
    }>>;
    confidence: z.ZodOptional<z.ZodEnum<{
        high: "high";
        low: "low";
        medium: "medium";
    }>>;
}, z.core.$strip>;
export type ReviseProposalRequest = z.infer<typeof reviseProposalRequestSchema>;
/** Shared by the route response and the Agent Builder tool's output contract. */
export declare const reviseProposalResponseSchema: z.ZodObject<{
    proposalId: z.ZodString;
    revision: z.ZodNumber;
    status: z.ZodEnum<{
        executing: "executing";
        expired: "expired";
        failed: "failed";
        no_action: "no_action";
        pending: "pending";
        succeeded: "succeeded";
        superseded: "superseded";
    }>;
}, z.core.$strip>;
export type ReviseProposalResponse = z.infer<typeof reviseProposalResponseSchema>;
