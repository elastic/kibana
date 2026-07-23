/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const alertEventSeveritySchema = z.enum(['info', 'low', 'medium', 'high', 'critical']);

/**
 * Mirrors alertEpisodeStatusSchema from alert_events.ts.
 * All four lifecycle states can be set explicitly by external callers.
 * When omitted, status defaults to active.
 */
const externalAlertStatusSchema = z.enum(['active', 'inactive', 'pending', 'recovering']);

const RESERVED_SOURCE_PREFIX = 'elastic.';

const sourceSchema = z
  .string()
  .min(1)
  .refine((v) => !v.startsWith(RESERVED_SOURCE_PREFIX), {
    message:
      'source cannot start with "elastic." — this prefix is reserved for Elastic-produced events.',
  });

export const createAlertEventDataSchema = z.object({
  // Required via body or /:source URL path — validated in the route handler.
  source: sourceSchema.optional(),

  // At least one of fingerprint / fingerprint_fields / rule_id is required.
  // Priority: fingerprint > fingerprint_fields (hashed from data.*) > rule_id (hashed with source).
  // Validated in the route handler after source is resolved.
  fingerprint: z.string().min(1).optional(),
  fingerprint_fields: z.array(z.string().min(1)).min(1).optional(),
  rule_id: z.string().min(1).optional(),

  rule_name: z.string().optional(),
  alert_url: z.string().optional(),
  alert_status: externalAlertStatusSchema.optional(),
  data: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().optional(),
  severity: alertEventSeveritySchema.optional(),
});

export const createAlertEventResponseSchema = z.object({
  group_hash: z.string(),
  episode_id: z.string(),
});

export type CreateAlertEventData = z.infer<typeof createAlertEventDataSchema>;
export type CreateAlertEventResponse = z.infer<typeof createAlertEventResponseSchema>;
