/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const installActionPolicyTemplateStatusSchema = z
  .enum(['created', 'skipped'])
  .describe('Whether the resource was created by this call or already existed and was skipped.');

export type InstallActionPolicyTemplateStatus = z.infer<
  typeof installActionPolicyTemplateStatusSchema
>;

export const installActionPolicyTemplatesResponseSchema = z
  .object({
    workflow: z
      .object({
        id: z.string().describe('The identifier of the placeholder console log workflow.'),
        status: installActionPolicyTemplateStatusSchema,
      })
      .strict(),
    policies: z
      .array(
        z
          .object({
            id: z.string().describe('The identifier of the template action policy.'),
            name: z.string().describe('The name of the template action policy.'),
            status: installActionPolicyTemplateStatusSchema,
          })
          .strict()
      )
      .describe('One entry per template action policy.'),
  })
  .strict()
  .meta({ id: 'alerting_install_action_policy_templates_response' });

export type InstallActionPolicyTemplatesResponse = z.infer<
  typeof installActionPolicyTemplatesResponseSchema
>;
