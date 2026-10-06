/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseStepDefinition } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
export declare const UpdateProposalStepId: 'proposals.updateProposal';
export declare const updateProposalStepInputSchema: z.ZodObject<
  {
    proposalId: z.ZodString;
    status: z.ZodPreprocess<
      z.ZodOptional<
        z.ZodEnum<{
          executing: 'executing';
          expired: 'expired';
          failed: 'failed';
          no_action: 'no_action';
          succeeded: 'succeeded';
        }>
      >
    >;
    decision: z.ZodPreprocess<
      z.ZodOptional<
        z.ZodEnum<{
          approved: 'approved';
          dismissed: 'dismissed';
        }>
      >
    >;
    decidedBy: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    dismissReason: z.ZodPreprocess<
      z.ZodOptional<
        z.ZodEnum<{
          duplicate: 'duplicate';
          false_positive: 'false_positive';
          handled_elsewhere: 'handled_elsewhere';
          no_reason: 'no_reason';
          other: 'other';
          risk_accepted: 'risk_accepted';
        }>
      >
    >;
    rationale: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    executionError: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
  },
  z.core.$strip
>;
export declare const updateProposalStepOutputSchema: z.ZodObject<
  {
    proposalId: z.ZodString;
    status: z.ZodEnum<{
      executing: 'executing';
      expired: 'expired';
      failed: 'failed';
      no_action: 'no_action';
      pending: 'pending';
      succeeded: 'succeeded';
      superseded: 'superseded';
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
export declare const updateProposalStepCommonDefinition: BaseStepDefinition<
  typeof updateProposalStepInputSchema,
  typeof updateProposalStepOutputSchema
>;
