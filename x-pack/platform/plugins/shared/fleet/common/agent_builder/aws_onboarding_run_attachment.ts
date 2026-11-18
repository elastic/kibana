/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

import { AWS_REGION_PATTERN } from '../services/cloud_connectors/iac_deployment';

export const AWS_ONBOARDING_RUN_ATTACHMENT_TYPE = 'fleet_aws_onboarding_run';

export interface AwsOnboardingRunAttachmentData {
  execution_id: string;
  workflow_id: string;
  region: string;
  /** Display names of the services the run onboards. */
  for_services: string[];
  stack_action: 'create' | 'update' | 'none';
  /** Policy templates the update adds to the identity; update only. */
  adding?: string[];
  started_at: string;
}

// Strict on purpose: everything that moves (stack, connector, policies, data) is read live by the
// card from the run route, so the attachment only identifies the run.
export const awsOnboardingRunAttachmentDataSchema = lazySchema(() =>
  z
    .object({
      execution_id: z.string(),
      workflow_id: z.string(),
      // The card builds the console link host from the region.
      region: z.string().regex(AWS_REGION_PATTERN),
      for_services: z.array(z.string()),
      stack_action: z.enum(['create', 'update', 'none']),
      adding: z.array(z.string()).optional(),
      started_at: z.string(),
    })
    .strict()
);
