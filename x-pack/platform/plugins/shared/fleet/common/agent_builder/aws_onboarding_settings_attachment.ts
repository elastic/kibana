/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

import {
  awsOnboardingSettingsAnswerSchema,
  awsOnboardingSettingsRequirementSchema,
} from '../workflows/steps/settings';
import type {
  AwsOnboardingSettingsAnswer,
  AwsOnboardingSettingsRequirement,
  SettingsProblem,
} from '../workflows/steps/settings';

export const AWS_ONBOARDING_SETTINGS_ATTACHMENT_TYPE = 'fleet_aws_onboarding_settings';

export interface AwsOnboardingSettingsAttachmentData {
  execution_id: string;
  requirement: AwsOnboardingSettingsRequirement;
  /** The latest answer received for the run, kept when invalid so the card can show it. */
  answer?: AwsOnboardingSettingsAnswer;
  problems?: SettingsProblem[];
}

// Strict at the top level so an unexpected key is rejected rather than stored.
export const awsOnboardingSettingsAttachmentDataSchema = lazySchema(() =>
  z
    .object({
      execution_id: z.string(),
      requirement: awsOnboardingSettingsRequirementSchema,
      answer: awsOnboardingSettingsAnswerSchema.optional(),
      problems: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    })
    .strict()
);
