/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { MAX_ARRAY_LENGTH, MAX_KEYWORD_LENGTH } from './limits';

const sloSettingsSchema = z.object({
  useAllRemoteClusters: z
    .boolean()
    .describe('Indicates if the remote clusters are all used for the summary'),
  selectedRemoteClusters: z
    .array(z.string().max(MAX_KEYWORD_LENGTH))
    .max(MAX_ARRAY_LENGTH)
    .describe('The list of remote clusters used for the summary'),
  staleThresholdInHours: z
    .number()
    .describe('The duration in hours after which an SLO instance is considered stale'),
  staleInstancesCleanupEnabled: z
    .boolean()
    .describe('Indicates if the cleanup of stale SLO instances is enabled'),
});

// The stale-instance fields were added later, so they can be missing in some stored settings.
const storedSloSettingsSchema = sloSettingsSchema.partial({
  staleThresholdInHours: true,
  staleInstancesCleanupEnabled: true,
});

const serverlessSloSettingsSchema = sloSettingsSchema.pick({
  staleThresholdInHours: true,
  staleInstancesCleanupEnabled: true,
});

export { serverlessSloSettingsSchema, sloSettingsSchema, storedSloSettingsSchema };
