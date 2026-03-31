/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { baseFeatureSchema } from '@kbn/streams-schema';

export const featureSummarySchema = baseFeatureSchema.pick({
  id: true,
  title: true,
});

export const tokenCountSchema = z.object({
  prompt: z.number(),
  completion: z.number(),
  total: z.number(),
  cached: z.number(),
});

export const iterationResultSchema = z.object({
  iteration: z.number(),
  durationMs: z.number(),
  state: z.string(),
  tokensUsed: tokenCountSchema,
  newFeatures: z.array(featureSummarySchema),
  updatedFeatures: z.array(featureSummarySchema),
});

export const streamCandidateSchema = z.object({
  streamName: z.string(),
  lastCompletedAt: z.string().nullable(),
});

export const kiSelectStreamsInputSchema = z.object({
  maxScheduledStreams: z.coerce.number().optional(),
});

export const kiFeaturesExtractStreamInputSchema = z.object({
  streamName: z.string(),
});
