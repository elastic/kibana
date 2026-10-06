/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseStepDefinition } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
export declare const SettleIncompleteProposalStepId: 'proposals.settleIncompleteProposal';
/**
 * Terminal statuses this step may write. `failed` and `expired` are the only
 * outcomes of an incomplete settle — not a human decision and not an action
 * success.
 */
export declare const settleIncompleteProposalStatusSchema: z.ZodEnum<{
  expired: 'expired';
  failed: 'failed';
}>;
export declare const settleIncompleteProposalStepInputSchema: z.ZodObject<
  {
    proposalId: z.ZodString;
    status: z.ZodPreprocess<
      z.ZodOptional<
        z.ZodEnum<{
          expired: 'expired';
          failed: 'failed';
        }>
      >
    >;
    executionError: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
  },
  z.core.$strip
>;
export declare const settleIncompleteProposalStepOutputSchema: z.ZodObject<
  {
    proposalId: z.ZodString;
    status: z.ZodEnum<{
      expired: 'expired';
      failed: 'failed';
    }>;
    decision: z.ZodOptional<
      z.ZodEnum<{
        approved: 'approved';
        dismissed: 'dismissed';
      }>
    >;
  },
  z.core.$strip
>;
export declare const settleIncompleteProposalStepCommonDefinition: BaseStepDefinition<
  typeof settleIncompleteProposalStepInputSchema,
  typeof settleIncompleteProposalStepOutputSchema
>;
