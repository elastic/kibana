/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE = 'fleet_aws_onboarding_credentials';

export type AwsOnboardingCredentialsStatus =
  | 'pending'
  | 'configured'
  | 'verified'
  | 'verify_failed';

export interface AwsOnboardingCredentialsAttachmentData {
  execution_id: string;
  region: string;
  status: AwsOnboardingCredentialsStatus;
  account_id?: string;
  access_key_id_masked?: string;
  error?: string;
}

// Strict on purpose: the secret access key must never travel in attachment data, so any
// unknown key is rejected rather than stripped.
export const awsOnboardingCredentialsAttachmentDataSchema = lazySchema(() =>
  z
    .object({
      execution_id: z.string(),
      region: z.string(),
      status: z.enum(['pending', 'configured', 'verified', 'verify_failed']),
      account_id: z.string().optional(),
      access_key_id_masked: z.string().optional(),
      error: z.string().optional(),
    })
    .strict()
);
