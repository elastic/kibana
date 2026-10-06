/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseStepDefinition } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
export declare const CheckDecidePrivilegesStepId: 'proposals.checkDecidePrivileges';
/**
 * Whether the gate was released through an external token link rather than by a
 * person. `hitl.respondedBy` is stamped as `external_resume:<stepExecutionId>`
 * on that path, and it is the only signal available: the request the step sees
 * belongs to the workflow runner either way.
 */
export declare const isExternalResumePrincipal: (respondedBy: string | undefined) => boolean;
export declare const checkDecidePrivilegesStepInputSchema: z.ZodObject<
  {
    proposalId: z.ZodString;
    respondedBy: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
  },
  z.core.$strip
>;
export declare const checkDecidePrivilegesStepOutputSchema: z.ZodObject<
  {
    canDecide: z.ZodBoolean;
  },
  z.core.$strip
>;
export declare const checkDecidePrivilegesStepCommonDefinition: BaseStepDefinition<
  typeof checkDecidePrivilegesStepInputSchema,
  typeof checkDecidePrivilegesStepOutputSchema
>;
