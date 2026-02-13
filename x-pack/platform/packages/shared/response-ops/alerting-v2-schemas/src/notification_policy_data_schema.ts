/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { durationSchema } from './common';

export const createNotificationPolicyDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  workflow_id: z.string(),
  matcher: z.string().optional(),
  group_by: z.array(z.string()).optional(),
  throttle: z.object({ interval: durationSchema }).optional(),
});

export type CreateNotificationPolicyData = z.infer<typeof createNotificationPolicyDataSchema>;

export const updateNotificationPolicyDataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  workflow_id: z.string().optional(),
  matcher: z.string().optional(),
  group_by: z.array(z.string()).optional(),
  throttle: z.object({ interval: durationSchema }).optional(),
});

export type UpdateNotificationPolicyData = z.infer<typeof updateNotificationPolicyDataSchema>;

export const updateNotificationPolicyBodySchema = updateNotificationPolicyDataSchema.extend({
  version: z.string(),
});

export type UpdateNotificationPolicyBody = z.infer<typeof updateNotificationPolicyBodySchema>;
