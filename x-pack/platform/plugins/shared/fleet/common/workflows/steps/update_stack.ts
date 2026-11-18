/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z, lazySchema } from '@kbn/zod/v4';

import { awsOnboardingIacIntegrationSchema } from './list_identities';

export const AwsOnboardingUpdateStackStepTypeId = 'fleet.awsOnboardingUpdateStack';

export const awsOnboardingUpdateStackInputSchema = lazySchema(() =>
  z.object({
    stack_id: z.string(),
    /** Everything the identity's role serves after the run: what it covers plus the new services. */
    integrations: z.array(awsOnboardingIacIntegrationSchema),
    /** The template digest stored on the reused connector. */
    template_sha: z.string().optional(),
    parameters: z.record(z.string(), z.string()),
  })
);

export const awsOnboardingUpdateStackOutputSchema = lazySchema(() =>
  z.object({
    stack_id: z.string(),
    stack_name: z.string(),
    template_sha: z.string().optional(),
    blueprint_id: z.string().optional(),
    blueprint_version: z.string().optional(),
    template_source: z.enum(['iacp', 'static']),
    /** True when the stack already grants what the run needs, so no update was started. */
    no_changes: z.boolean(),
  })
);

export type AwsOnboardingUpdateStackInput = z.infer<typeof awsOnboardingUpdateStackInputSchema>;
export type AwsOnboardingUpdateStackOutput = z.infer<typeof awsOnboardingUpdateStackOutputSchema>;

export const awsOnboardingUpdateStackCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingUpdateStackInputSchema,
  typeof awsOnboardingUpdateStackOutputSchema
> = {
  id: AwsOnboardingUpdateStackStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingUpdateStack.label', {
    defaultMessage: 'Update the AWS CloudFormation stack',
  }),
  description: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingUpdateStack.description', {
    defaultMessage:
      "Render the federated identity template for everything a reused identity will serve and update the identity's CloudFormation stack in the connected AWS account.",
  }),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingUpdateStackInputSchema,
  outputSchema: awsOnboardingUpdateStackOutputSchema,
};
