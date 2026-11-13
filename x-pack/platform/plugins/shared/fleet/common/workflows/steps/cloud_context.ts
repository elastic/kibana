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

export const AwsOnboardingCloudContextStepTypeId = 'fleet.awsOnboardingCloudContext';

export const awsOnboardingCloudContextInputSchema = lazySchema(() =>
  z.object({
    overrides: z.record(z.string(), z.string()).optional(),
  })
);

export const awsOnboardingCloudContextOutputSchema = lazySchema(() =>
  z.object({
    parameters: z.record(z.string(), z.string()),
    source: z.enum(['cloud', 'overrides', 'none']),
  })
);

export type AwsOnboardingCloudContextInput = z.infer<typeof awsOnboardingCloudContextInputSchema>;
export type AwsOnboardingCloudContextOutput = z.infer<typeof awsOnboardingCloudContextOutputSchema>;

export const awsOnboardingCloudContextCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingCloudContextInputSchema,
  typeof awsOnboardingCloudContextOutputSchema
> = {
  id: AwsOnboardingCloudContextStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingCloudContext.label', {
    defaultMessage: 'Read the Elastic Cloud context for the AWS stack',
  }),
  description: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingCloudContext.description', {
    defaultMessage:
      'Derive the Elastic Cloud parameters the AWS CloudFormation stack needs from this deployment or project, with optional overrides.',
  }),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingCloudContextInputSchema,
  outputSchema: awsOnboardingCloudContextOutputSchema,
};
