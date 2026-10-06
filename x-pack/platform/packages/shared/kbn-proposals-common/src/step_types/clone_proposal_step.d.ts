import type { BaseStepDefinition } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
export declare const CloneProposalStepId: 'proposals.cloneProposal';
export declare const cloneProposalStepInputSchema: z.ZodObject<{
    proposalId: z.ZodString;
    executionError: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const cloneProposalStepOutputSchema: z.ZodObject<{
    proposalId: z.ZodString;
}, z.core.$strip>;
export declare const cloneProposalStepCommonDefinition: BaseStepDefinition<typeof cloneProposalStepInputSchema, typeof cloneProposalStepOutputSchema>;
