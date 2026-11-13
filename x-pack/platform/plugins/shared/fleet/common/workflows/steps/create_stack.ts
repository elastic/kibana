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

export const AwsOnboardingCreateStackStepTypeId = 'fleet.awsOnboardingCreateStack';

export const awsOnboardingCreateStackInputSchema = lazySchema(() =>
  z.object({
    integrations: z.array(
      z.object({
        name: z.string(),
        policyTemplates: z.array(
          z.object({ name: z.string(), enabledInputs: z.array(z.string()) })
        ),
      })
    ),
    parameters: z.record(z.string(), z.string()),
  })
);

export const awsOnboardingCreateStackOutputSchema = lazySchema(() =>
  z.object({
    stack_id: z.string(),
    stack_name: z.string(),
    template_sha: z.string().optional(),
    blueprint_id: z.string().optional(),
    blueprint_version: z.string().optional(),
    template_source: z.enum(['iacp', 'static']),
  })
);

export type AwsOnboardingCreateStackInput = z.infer<typeof awsOnboardingCreateStackInputSchema>;
export type AwsOnboardingCreateStackOutput = z.infer<typeof awsOnboardingCreateStackOutputSchema>;

export const awsOnboardingCreateStackCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingCreateStackInputSchema,
  typeof awsOnboardingCreateStackOutputSchema
> = {
  id: AwsOnboardingCreateStackStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingCreateStack.label', {
    defaultMessage: 'Create the AWS CloudFormation stack',
  }),
  description: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingCreateStack.description', {
    defaultMessage:
      'Render the federated identity template for the chosen integrations and create the CloudFormation stack in the connected AWS account.',
  }),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingCreateStackInputSchema,
  outputSchema: awsOnboardingCreateStackOutputSchema,
};
