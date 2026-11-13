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

export const AwsOnboardingCreatePoliciesStepTypeId = 'fleet.awsOnboardingCreatePolicies';

export const awsOnboardingCreatePoliciesInputSchema = lazySchema(() =>
  z.object({
    policies: z.array(
      z.object({
        service: z.string(),
        name: z.string(),
        body: z.record(z.string(), z.unknown()),
      })
    ),
    cloud_connector_id: z.string(),
  })
);

export const awsOnboardingCreatePoliciesOutputSchema = lazySchema(() =>
  z.object({
    policies: z.array(z.object({ service: z.string(), policy_id: z.string() })),
    policy_ids: z.array(z.string()),
  })
);

export type AwsOnboardingCreatePoliciesInput = z.infer<
  typeof awsOnboardingCreatePoliciesInputSchema
>;
export type AwsOnboardingCreatePoliciesOutput = z.infer<
  typeof awsOnboardingCreatePoliciesOutputSchema
>;

export const awsOnboardingCreatePoliciesCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingCreatePoliciesInputSchema,
  typeof awsOnboardingCreatePoliciesOutputSchema
> = {
  id: AwsOnboardingCreatePoliciesStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingCreatePolicies.label', {
    defaultMessage: 'Create agentless AWS policies',
  }),
  description: i18n.translate(
    'xpack.fleet.workflows.steps.awsOnboardingCreatePolicies.description',
    {
      defaultMessage:
        'Create one agentless integration policy per AWS service, each using the given cloud connector.',
    }
  ),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingCreatePoliciesInputSchema,
  outputSchema: awsOnboardingCreatePoliciesOutputSchema,
};
