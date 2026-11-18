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

export const AwsOnboardingCredentialsStepTypeId = 'fleet.awsOnboardingCredentials';

export const awsOnboardingCredentialsInputSchema = lazySchema(() => z.object({}));

export const awsOnboardingCredentialsOutputSchema = lazySchema(() =>
  z.object({
    configured: z.boolean(),
    mode: z.enum(['fully-managed', 'partially-managed']).optional(),
    account_id: z.string().optional(),
    /** The region of the stored credentials, which discovery also uses. */
    region: z.string().optional(),
    discovery_ok: z.boolean().optional(),
    provisioning_ok: z.boolean().optional(),
    error: z.string().optional(),
  })
);

export type AwsOnboardingCredentialsOutput = z.infer<typeof awsOnboardingCredentialsOutputSchema>;

export const awsOnboardingCredentialsCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingCredentialsInputSchema,
  typeof awsOnboardingCredentialsOutputSchema
> = {
  id: AwsOnboardingCredentialsStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingCredentials.label', {
    defaultMessage: 'Check AWS onboarding credentials',
  }),
  description: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingCredentials.description', {
    defaultMessage:
      'Report whether AWS onboarding credentials are stored and whether the stored roles can be assumed.',
  }),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingCredentialsInputSchema,
  outputSchema: awsOnboardingCredentialsOutputSchema,
};
