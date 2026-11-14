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

export const AwsOnboardingHasDataStepTypeId = 'fleet.awsOnboardingHasData';

export const awsOnboardingHasDataInputSchema = lazySchema(() =>
  z.object({
    policy_ids: z.array(z.string()),
    package_name: z.string(),
    package_version: z.string(),
  })
);

export const awsOnboardingHasDataOutputSchema = lazySchema(() =>
  z.object({
    has_data: z.boolean(),
    policies_with_data: z.array(z.string()),
    policies_without_data: z.array(z.string()),
    agents: z.array(
      z.object({
        policy_id: z.string(),
        agent_id: z.string().optional(),
        agent_policy_id: z.string().optional(),
        status: z.string().optional(),
        data: z.boolean(),
      })
    ),
  })
);

export type AwsOnboardingHasDataInput = z.infer<typeof awsOnboardingHasDataInputSchema>;
export type AwsOnboardingHasDataOutput = z.infer<typeof awsOnboardingHasDataOutputSchema>;

export const awsOnboardingHasDataCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingHasDataInputSchema,
  typeof awsOnboardingHasDataOutputSchema
> = {
  id: AwsOnboardingHasDataStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingHasData.label', {
    defaultMessage: 'Check AWS onboarding data arrival',
  }),
  description: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingHasData.description', {
    defaultMessage:
      'Check whether the agents running the given policies have started reporting data for the package.',
  }),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingHasDataInputSchema,
  outputSchema: awsOnboardingHasDataOutputSchema,
};
