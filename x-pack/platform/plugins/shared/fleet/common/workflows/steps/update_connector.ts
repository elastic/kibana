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

export const AwsOnboardingUpdateConnectorStepTypeId = 'fleet.awsOnboardingUpdateConnector';

export const awsOnboardingUpdateConnectorInputSchema = lazySchema(() =>
  z.object({
    cloud_connector_id: z.string(),
    template_sha: z.string().optional(),
    blueprint_id: z.string().optional(),
    blueprint_version: z.string().optional(),
  })
);

export const awsOnboardingUpdateConnectorOutputSchema = lazySchema(() =>
  z.object({
    cloud_connector_id: z.string(),
  })
);

export type AwsOnboardingUpdateConnectorInput = z.infer<
  typeof awsOnboardingUpdateConnectorInputSchema
>;
export type AwsOnboardingUpdateConnectorOutput = z.infer<
  typeof awsOnboardingUpdateConnectorOutputSchema
>;

export const awsOnboardingUpdateConnectorCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingUpdateConnectorInputSchema,
  typeof awsOnboardingUpdateConnectorOutputSchema
> = {
  id: AwsOnboardingUpdateConnectorStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingUpdateConnector.label', {
    defaultMessage: 'Update the AWS cloud connector',
  }),
  description: i18n.translate(
    'xpack.fleet.workflows.steps.awsOnboardingUpdateConnector.description',
    {
      defaultMessage:
        "Record the template a reused cloud connector's CloudFormation stack was updated to.",
    }
  ),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingUpdateConnectorInputSchema,
  outputSchema: awsOnboardingUpdateConnectorOutputSchema,
};
