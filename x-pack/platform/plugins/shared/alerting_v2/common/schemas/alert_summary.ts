/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Matches the ES|QL BUCKET() fixed_interval literal grammar.
 * Accepted units: millisecond, second, minute, hour, day, week, month, year (plus short forms).
 * Examples: `1h`, `30m`, `1 day`, `7d`.
 */
const FIXED_INTERVAL_PATTERN =
  /^\s*\d+\s*(ms|s|m|h|d|w|M|y|millisecond|milliseconds|second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s*$/;

export const alertSummaryBucketSchema = z.object({
  /** Epoch-millis for the bucket start. */
  key: z.number(),
  /** ISO-8601 string for the bucket start. */
  key_as_string: z.string(),
  /** Number of alert events (status == "breached" or "recovered") falling into the bucket. */
  doc_count: z.number(),
});

export const alertSummaryRequestSchema = z
  .object({
    /** Inclusive start of the time range. Must be parseable as a date. */
    gte: z.string().min(1),
    /** Inclusive end of the time range. Must be parseable as a date. */
    lte: z.string().min(1),
    /**
     * ES|QL BUCKET() fixed interval literal, e.g. `1h`, `30m`, `1d`.
     * Client is responsible for picking a sensible interval for the requested range.
     */
    fixed_interval: z.string().regex(FIXED_INTERVAL_PATTERN, {
      message:
        'fixed_interval must be a valid ES|QL BUCKET() interval literal (e.g. "1h", "30m", "1d")',
    }),
    /**
     * Rule ids to include. Array may be empty, in which case the endpoint returns
     * zeroed counts and empty series without querying Elasticsearch.
     */
    ruleIds: z.array(z.string().min(1)).max(1000),
  })
  .refine(
    (value) => {
      const start = Date.parse(value.gte);
      const end = Date.parse(value.lte);
      return !Number.isNaN(start) && !Number.isNaN(end) && start < end;
    },
    { message: 'gte must parse as a date and be strictly before lte' }
  );

export const alertSummaryResponseSchema = z.object({
  /** Total alert events with status == "breached" across the time range. */
  activeEventCount: z.number(),
  /** Total alert events with status == "recovered" across the time range. */
  recoveredEventCount: z.number(),
  /** Per-bucket doc counts for status == "breached", sorted ascending by key. */
  activeSeries: z.array(alertSummaryBucketSchema),
  /** Per-bucket doc counts for status == "recovered", sorted ascending by key. */
  recoveredSeries: z.array(alertSummaryBucketSchema),
});

export type AlertSummaryBucket = z.infer<typeof alertSummaryBucketSchema>;
export type AlertSummaryRequest = z.infer<typeof alertSummaryRequestSchema>;
export type AlertSummaryResponse = z.infer<typeof alertSummaryResponseSchema>;
