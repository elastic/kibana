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

export const AwsOnboardingDiscoverStepTypeId = 'fleet.awsOnboardingDiscover';

export const awsOnboardingDiscoverInputSchema = lazySchema(() =>
  z.object({
    region: z.string(),
  })
);

export const awsOnboardingDiscoverOutputSchema = lazySchema(() =>
  z.object({
    account_id: z.string().optional(),
    services: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        billing_name: z.string().optional(),
        matched: z.boolean(),
        agentless: z.boolean(),
        detector_ids: z.array(z.string()).optional(),
      })
    ),
    errors: z.array(z.object({ source: z.string(), message: z.string() })),
  })
);

export type AwsOnboardingDiscoverInput = z.infer<typeof awsOnboardingDiscoverInputSchema>;
export type AwsOnboardingDiscoverOutput = z.infer<typeof awsOnboardingDiscoverOutputSchema>;

export const awsOnboardingDiscoverCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingDiscoverInputSchema,
  typeof awsOnboardingDiscoverOutputSchema
> = {
  id: AwsOnboardingDiscoverStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingDiscover.label', {
    defaultMessage: 'Discover AWS services in use',
  }),
  description: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingDiscover.description', {
    defaultMessage:
      'List the AWS services in use in the connected account and mark which can be collected with an agentless integration.',
  }),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingDiscoverInputSchema,
  outputSchema: awsOnboardingDiscoverOutputSchema,
};
