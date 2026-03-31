/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const featureSummarySchema = z.object({
  id: z.string(),
  title: z.string().optional(),
});

export const tokenCountSchema = z.object({
  prompt: z.number(),
  completion: z.number(),
  total: z.number(),
  cached: z.number().optional().default(0),
});

export const iterationResultSchema = z.object({
  iteration: z.number(),
  durationMs: z.number(),
  state: z.enum(['success', 'failure']),
  tokensUsed: tokenCountSchema,
  newFeatures: z.array(featureSummarySchema),
  updatedFeatures: z.array(featureSummarySchema),
});

export const streamCandidateSchema = z.object({
  streamName: z.string(),
  lastCompletedAt: z.string().nullable(),
});

export const kiSelectStreamsInputSchema = z.object({
  maxScheduledStreams: z.coerce.number().min(0).optional(),
  lookbackHours: z.coerce.number().min(0).optional(),
  extractionIntervalHours: z.coerce.number().min(0).optional(),
});

export const kiFeaturesExtractStreamInputSchema = z.object({
  streamName: z.string(),
  scheduledStreams: z.array(z.object({ streamName: z.string() })),
});

export const kiSelectStreamsOutputSchema = z.object({
  connectorId: z.string(),
  scheduled: z.array(streamCandidateSchema),
  failedToSchedule: z.array(streamCandidateSchema),
  alreadyRunning: z.array(z.object({ streamName: z.string(), scheduledAt: z.string().nullable() })),
  skipped: z.array(streamCandidateSchema),
  upToDate: z.array(streamCandidateSchema),
  excluded: z.array(z.string()),
  settings: z.object({
    enabled: z.boolean(),
    intervalHours: z.number(),
    excludePatterns: z.array(z.string()),
  }),
});

export const kiFeaturesExtractStreamOutputSchema = z.object({
  streamName: z.string(),
  status: z.string(),
  summary: z.object({
    durationMs: z.number(),
    tokensUsed: tokenCountSchema,
    features: z.object({
      llm: z.array(featureSummarySchema),
      computed: z.array(featureSummarySchema),
    }),
  }),
  iterations: z.array(iterationResultSchema),
});
