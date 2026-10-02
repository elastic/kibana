/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const installActionPolicySampleStatusSchema = z
  .enum(['created', 'skipped'])
  .describe('Whether the resource was created by this call or already existed and was skipped.');

export type InstallActionPolicySampleStatus = z.infer<typeof installActionPolicySampleStatusSchema>;

export const installActionPolicySamplesResponseSchema = z
  .object({
    workflow: z
      .object({
        id: z.string().describe('The identifier of the placeholder console log workflow.'),
        status: installActionPolicySampleStatusSchema,
      })
      .strict(),
    policies: z
      .array(
        z
          .object({
            id: z.string().describe('The identifier of the sample action policy.'),
            name: z.string().describe('The name of the sample action policy.'),
            status: installActionPolicySampleStatusSchema,
          })
          .strict()
      )
      .describe('One entry per sample action policy.'),
  })
  .strict()
  .meta({ id: 'alerting_install_action_policy_samples_response' });

export type InstallActionPolicySamplesResponse = z.infer<
  typeof installActionPolicySamplesResponseSchema
>;
