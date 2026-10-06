import type { BaseStepDefinition } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
export declare const CreateProposalStepId: 'proposals.createProposal';
export declare const createProposalStepInputSchema: z.ZodObject<{
    conversationId: z.ZodString;
    title: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    comment: z.ZodString;
    actionWorkflowId: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    actionInput: z.ZodPreprocess<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    impact: z.ZodPreprocess<z.ZodOptional<z.ZodEnum<{
        critical: "critical";
        high: "high";
        low: "low";
        medium: "medium";
    }>>>;
    category: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    confidence: z.ZodPreprocess<z.ZodOptional<z.ZodEnum<{
        high: "high";
        low: "low";
        medium: "medium";
    }>>>;
    origin: z.ZodEnum<{
        agent_builder: "agent_builder";
        alertzero: "alertzero";
        context_engine: "context_engine";
        nightshift: "nightshift";
    }>;
    expiresIn: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const createProposalStepOutputSchema: z.ZodObject<{
    proposalId: z.ZodString;
    rootProposalId: z.ZodString;
    status: z.ZodString;
    category: z.ZodOptional<z.ZodString>;
    alwaysGate: z.ZodBoolean;
    expiresAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createProposalStepCommonDefinition: BaseStepDefinition<typeof createProposalStepInputSchema, typeof createProposalStepOutputSchema>;
