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

export const AwsOnboardingStackStatusStepTypeId = 'fleet.awsOnboardingStackStatus';

export const awsOnboardingStackStatusInputSchema = lazySchema(() =>
  z.object({
    stack_id: z.string(),
  })
);

export const awsOnboardingStackStatusOutputSchema = lazySchema(() =>
  z.object({
    status: z.enum(['in_progress', 'complete', 'failed', 'not_found']),
    stack_status: z.string().optional(),
    reason: z.string().optional(),
    latest_event: z
      .object({
        resource: z.string(),
        status: z.string(),
        timestamp: z.string(),
        reason: z.string().optional(),
      })
      .optional(),
    role_arn: z.string().optional(),
    oidc_provider_arn: z.string().optional(),
  })
);

export type AwsOnboardingStackStatusInput = z.infer<typeof awsOnboardingStackStatusInputSchema>;
export type AwsOnboardingStackStatusOutput = z.infer<typeof awsOnboardingStackStatusOutputSchema>;

export const awsOnboardingStackStatusCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingStackStatusInputSchema,
  typeof awsOnboardingStackStatusOutputSchema
> = {
  id: AwsOnboardingStackStatusStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingStackStatus.label', {
    defaultMessage: 'Check the AWS CloudFormation stack status',
  }),
  description: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingStackStatus.description', {
    defaultMessage:
      'Report whether the CloudFormation stack is still being created, finished, or failed, and return the role it created.',
  }),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingStackStatusInputSchema,
  outputSchema: awsOnboardingStackStatusOutputSchema,
};
