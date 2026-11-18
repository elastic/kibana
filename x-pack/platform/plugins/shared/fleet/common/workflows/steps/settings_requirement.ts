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

import { awsOnboardingSettingsRequirementSchema } from './settings';

export const AwsOnboardingSettingsRequirementStepTypeId = 'fleet.awsOnboardingSettingsRequirement';

export const awsOnboardingSettingsRequirementInputSchema = lazySchema(() =>
  z.object({
    /** The services picked in the selection pause; set only when discovery ran. */
    selected_services: z.array(z.string()).optional(),
    /** The services the run was started with; used when there was no selection pause. */
    services: z.array(z.string()).optional(),
    region: z.string(),
    account_id: z.string().optional(),
    /** Short per-run suffix that keeps the suggested identity name unique across runs. */
    run_suffix: z.string().optional(),
  })
);

/** The requirement plus the identity name the plan offers by default. */
export const awsOnboardingSettingsRequirementOutputSchema = lazySchema(() =>
  awsOnboardingSettingsRequirementSchema.extend({ suggested_identity_name: z.string() })
);

export type AwsOnboardingSettingsRequirementInput = z.infer<
  typeof awsOnboardingSettingsRequirementInputSchema
>;
export type AwsOnboardingSettingsRequirementOutput = z.infer<
  typeof awsOnboardingSettingsRequirementOutputSchema
>;

export const awsOnboardingSettingsRequirementCommonDefinition: CommonStepDefinition<
  typeof awsOnboardingSettingsRequirementInputSchema,
  typeof awsOnboardingSettingsRequirementOutputSchema
> = {
  id: AwsOnboardingSettingsRequirementStepTypeId,
  label: i18n.translate('xpack.fleet.workflows.steps.awsOnboardingSettingsRequirement.label', {
    defaultMessage: 'Describe AWS onboarding settings',
  }),
  description: i18n.translate(
    'xpack.fleet.workflows.steps.awsOnboardingSettingsRequirement.description',
    {
      defaultMessage:
        'List, for each chosen AWS service, the collection methods and the values the package needs to onboard it.',
    }
  ),
  category: StepCategory.Kibana,
  inputSchema: awsOnboardingSettingsRequirementInputSchema,
  outputSchema: awsOnboardingSettingsRequirementOutputSchema,
};
