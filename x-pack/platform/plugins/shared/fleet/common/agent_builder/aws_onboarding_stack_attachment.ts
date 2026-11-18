/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

import { AWS_REGION_PATTERN } from '../services/cloud_connectors/iac_deployment';

export const AWS_ONBOARDING_STACK_ATTACHMENT_TYPE = 'fleet_aws_onboarding_stack';

export interface AwsOnboardingStackAttachmentData {
  execution_id: string;
  stack_id: string;
  stack_name: string;
  region: string;
  action: 'create' | 'update';
  /** Display names of the services the run onboards. */
  for_services: string[];
  /** Policy templates the update adds to the identity; update only. */
  adding?: string[];
  started_at: string;
}

// Strict on purpose: everything that moves (status, resources, the role ARN) is read live by the
// card from the stack route, so the attachment only identifies the stack.
export const awsOnboardingStackAttachmentDataSchema = lazySchema(() =>
  z
    .object({
      execution_id: z.string(),
      stack_id: z.string(),
      stack_name: z.string(),
      // The card builds the console link host from the region.
      region: z.string().regex(AWS_REGION_PATTERN),
      action: z.enum(['create', 'update']),
      for_services: z.array(z.string()),
      adding: z.array(z.string()).optional(),
      started_at: z.string(),
    })
    .strict()
);
