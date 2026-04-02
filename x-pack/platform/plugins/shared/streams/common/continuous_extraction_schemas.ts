/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const streamCandidateSchema = z.object({
  streamName: z.string(),
  lastCompletedAt: z.string().nullable(),
});

export const kiSelectStreamsInputSchema = z.object({
  maxScheduledStreams: z.coerce.number().min(0).optional(),
  lookbackHours: z.coerce.number().min(0).optional(),
  extractionIntervalHours: z.coerce.number().min(0).optional(),
});

export const kiSelectStreamsOutputSchema = z.object({
  connectorId: z.string(),
  scheduled: z.array(streamCandidateSchema),
  failedToSchedule: z.array(streamCandidateSchema),
  alreadyRunning: z.array(z.object({ streamName: z.string(), scheduledAt: z.string().nullable() })),
  skipped: z.array(streamCandidateSchema),
  upToDate: z.array(streamCandidateSchema),
  excluded: z.array(z.string()),
  unsupported: z.array(z.string()),
  settings: z.object({
    enabled: z.boolean(),
    intervalHours: z.number(),
    excludePatterns: z.array(z.string()),
  }),
});
