/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { MAX_ARRAY_LENGTH, MAX_KEYWORD_LENGTH } from './limits';

const useAllRemoteClustersSchema = z
  .boolean()
  .describe('Indicates if the remote clusters are all used for the summary');
const selectedRemoteClustersSchema = z
  .array(z.string().max(MAX_KEYWORD_LENGTH))
  .max(MAX_ARRAY_LENGTH)
  .describe('The list of remote clusters used for the summary');
const staleThresholdInHoursSchema = z
  .number()
  .describe('The duration in hours after which an SLO instance is considered stale');
const staleInstancesCleanupEnabledSchema = z
  .boolean()
  .describe('Indicates if the cleanup of stale SLO instances is enabled');

const storedSloSettingsSchema = z.object({
  useAllRemoteClusters: useAllRemoteClustersSchema,
  selectedRemoteClusters: selectedRemoteClustersSchema,
  // was added later, so it can be missing in some stored settings
  staleThresholdInHours: staleThresholdInHoursSchema.optional(),
  staleInstancesCleanupEnabled: staleInstancesCleanupEnabledSchema.optional(),
});

const sloSettingsSchema = z.object({
  useAllRemoteClusters: useAllRemoteClustersSchema,
  selectedRemoteClusters: selectedRemoteClustersSchema,
  staleThresholdInHours: staleThresholdInHoursSchema,
  staleInstancesCleanupEnabled: staleInstancesCleanupEnabledSchema,
});

const serverlessSloSettingsSchema = z.object({
  staleThresholdInHours: staleThresholdInHoursSchema,
  staleInstancesCleanupEnabled: staleInstancesCleanupEnabledSchema,
});

export { serverlessSloSettingsSchema, sloSettingsSchema, storedSloSettingsSchema };
