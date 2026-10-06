/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseStepDefinition } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
export declare const GetLatestRevisionStepId: 'proposals.getLatestRevision';
export declare const getLatestRevisionStepInputSchema: z.ZodObject<
  {
    proposalId: z.ZodString;
  },
  z.core.$strip
>;
export declare const getLatestRevisionStepOutputSchema: z.ZodObject<
  {
    proposalId: z.ZodString;
    revision: z.ZodNumber;
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
    actionInput: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  },
  z.core.$strip
>;
/**
 * Resolves the live revision of a chain. The gate workflow's loop carries a
 * proposal id that a revision inserted while the gate is parked invalidates,
 * so decisions resolve through this step rather than writing to a stale id.
 */
export declare const getLatestRevisionStepCommonDefinition: BaseStepDefinition<
  typeof getLatestRevisionStepInputSchema,
  typeof getLatestRevisionStepOutputSchema
>;
