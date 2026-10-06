import type { BaseStepDefinition } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
export declare const GetProposalStepId: 'proposals.getProposal';
export declare const getProposalStepInputSchema: z.ZodObject<{
    proposalId: z.ZodString;
}, z.core.$strip>;
/** Only the fields a gating workflow branches on; not the whole record. */
export declare const getProposalStepOutputSchema: z.ZodObject<{
    status: z.ZodEnum<{
        executing: "executing";
        expired: "expired";
        failed: "failed";
        no_action: "no_action";
        pending: "pending";
        succeeded: "succeeded";
        superseded: "superseded";
    }>;
    decision: z.ZodOptional<z.ZodEnum<{
        approved: "approved";
        dismissed: "dismissed";
    }>>;
    decidedBy: z.ZodOptional<z.ZodObject<{
        username: z.ZodNullable<z.ZodString>;
        fullName: z.ZodNullable<z.ZodString>;
        email: z.ZodNullable<z.ZodString>;
        profileUid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    supersededBy: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodString>;
    actionWorkflowId: z.ZodOptional<z.ZodString>;
    dismissReason: z.ZodOptional<z.ZodEnum<{
        duplicate: "duplicate";
        false_positive: "false_positive";
        handled_elsewhere: "handled_elsewhere";
        no_reason: "no_reason";
        other: "other";
        risk_accepted: "risk_accepted";
    }>>;
    rationale: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const getProposalStepCommonDefinition: BaseStepDefinition<typeof getProposalStepInputSchema, typeof getProposalStepOutputSchema>;
