/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const executionLogEntrySchema = z.object({
  timestamp: z.string(),
  scheduled_at: z.string(),
  duration_ms: z.number(),
  outcome: z.string(),
  message: z.string(),
  active_alerts: z.number(),
});

export const executionLogResponseSchema = z.array(executionLogEntrySchema);

export const executionKpiResponseSchema = z.object({
  succeeded: z.number(),
  failed: z.number(),
});

export const executionBreakdownBucketSchema = z.object({
  bucket: z.string(),
  succeeded: z.number(),
  failed: z.number(),
});

export const executionBreakdownResponseSchema = z.array(executionBreakdownBucketSchema);
