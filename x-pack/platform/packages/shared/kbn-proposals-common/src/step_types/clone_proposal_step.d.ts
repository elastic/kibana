/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseStepDefinition } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
export declare const CloneProposalStepId: 'proposals.cloneProposal';
export declare const cloneProposalStepInputSchema: z.ZodObject<
  {
    proposalId: z.ZodString;
    executionError: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
  },
  z.core.$strip
>;
export declare const cloneProposalStepOutputSchema: z.ZodObject<
  {
    proposalId: z.ZodString;
  },
  z.core.$strip
>;
export declare const cloneProposalStepCommonDefinition: BaseStepDefinition<
  typeof cloneProposalStepInputSchema,
  typeof cloneProposalStepOutputSchema
>;
