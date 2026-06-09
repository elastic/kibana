/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const alertEventSeveritySchema = z.enum(['info', 'low', 'medium', 'high', 'critical']);

/**
 * Only `pending` and `recovering` can be explicitly set by callers.
 * `active` and `inactive` are inferred from the presence of `ended_at`.
 */
const externalEpisodeStatusSchema = z.enum(['pending', 'recovering']);

export const createAlertEventDataSchema = z.object({
  source_id: z
    .string()
    .min(1)
    .describe(
      'Stable identifier for the alert source (e.g. a rule name or integration identifier).'
    ),
  episode_id: z
    .string()
    .min(1)
    .describe('Unique identifier for this alert episode. Stable across state-change updates.'),
  data: z
    .record(z.string(), z.any())
    .describe('Arbitrary alert payload stored in data.*.'),
  fingerprint: z
    .string()
    .optional()
    .describe(
      'Stable series identifier. Same condition across multiple firings shares a fingerprint. ' +
        'When omitted, episode_id is used as the series seed.'
    ),
  timestamp: z.string().optional().describe('ISO 8601 event timestamp.'),
  started_at: z.string().optional().describe('ISO 8601 time when this episode began.'),
  ended_at: z
    .string()
    .optional()
    .describe('ISO 8601 time when this episode ended. Presence implies recovery.'),
  episode_status: externalEpisodeStatusSchema
    .optional()
    .describe(
      'Explicit episode lifecycle override. Use `pending` or `recovering` to represent ' +
        'transitional states. Omit to infer from ended_at (inactive when present, active otherwise).'
    ),
  severity: alertEventSeveritySchema.optional(),
});

export const createAlertEventResponseSchema = z.object({
  id: z
    .string()
    .describe(
      'The server-computed group_hash for this alert series. ' +
        'Used in alert action URLs (/alerts/{id}/ack, etc.).'
    ),
});

export type CreateAlertEventData = z.infer<typeof createAlertEventDataSchema>;
export type CreateAlertEventResponse = z.infer<typeof createAlertEventResponseSchema>;
