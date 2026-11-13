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

export const AwsOnboardingCreateConnectorStepTypeId = 'fleet.awsOnboardingCreateConnector';

export const awsOnboardingCreateConnectorInputSchema = lazySchema(() =>
  z.object({
    name: z.string(),
    role_arn: z.string(),
    stack_id: z.string(),
    template_sha: z.string().optional(),
    blueprint_id: z.string().optional(),
    blueprint_version: z.string().optional(),
  })
);

export const awsOnboardingCreateConnectorOutputSchema = lazySchema(() =>
  z.object({
    cloud_connector_id: z.string(),
  })
);

export type AwsOnboardingCreateConnectorInput = z.infer<
  typeof awsOnboardingCreateConnectorInputSchema
>;
export type AwsOnboardingCreateConnectorOutput = z.infer<
  typeof awsOnboardingCreateConnectorOutputSchema
>;

export const awsOnboardingCreateConnectorCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingCreateConnectorInputSchema,
  typeof awsOnboardingCreateConnectorOutputSchema
> = {
  id: AwsOnboardingCreateConnectorStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingCreateConnector.label', {
    defaultMessage: 'Create the AWS cloud connector',
  }),
  description: i18n.translate(
    'xpack.fleet.workflows.steps.awsOnboardingCreateConnector.description',
    {
      defaultMessage:
        'Register the IAM role created by the CloudFormation stack as a cloud connector, recording the stack and template it came from.',
    }
  ),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingCreateConnectorInputSchema,
  outputSchema: awsOnboardingCreateConnectorOutputSchema,
};
