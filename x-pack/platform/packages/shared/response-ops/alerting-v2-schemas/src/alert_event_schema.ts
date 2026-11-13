/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { alertEventSeveritySchema } from './severity';

const alertEventStatusSchema = lazySchema(() => z.enum(['breached', 'recovered', 'no_data']));
const alertEventTypeSchema = lazySchema(() => z.enum(['signal', 'alert']));
const alertEpisodeStatusSchema = lazySchema(() =>
  z.enum(['inactive', 'pending', 'active', 'recovering'])
);
const alertEpisodeStatusCountSchema = lazySchema(() => z.number().int().optional());

export const alertEventStatus = alertEventStatusSchema.enum;
export const alertEventType = alertEventTypeSchema.enum;
export const alertEpisodeStatus = alertEpisodeStatusSchema.enum;

export const alertEventSchema = lazySchema(() =>
  z.object({
    '@timestamp': z.string(),
    scheduled_timestamp: z.string().optional(),
    rule: z.object({ id: z.string().optional(), version: z.number().optional() }).optional(),
    group_hash: z.string(),
    data: z.record(z.string(), z.unknown()),
    status: alertEventStatusSchema,
    source: z.string(),
    type: alertEventTypeSchema,
    // Matches the `alert` mapping field (renamed from `episode` in v8).
    alert: z
      .object({
        id: z.string(),
        status: alertEpisodeStatusSchema,
        status_count: alertEpisodeStatusCountSchema,
      })
      .optional(),
    space_id: z.string(),
    severity: alertEventSeveritySchema.optional(),
  })
);

export type AlertEvent = z.infer<typeof alertEventSchema>;
/**
 * Write shape: `@timestamp` is set by the data stream's ingest pipeline at index time.
 * Only the public alert events API sets it, when the caller supplies a timestamp.
 */
export type AlertEventDocument = Omit<AlertEvent, '@timestamp'> & { '@timestamp'?: string };
export type AlertEventStatus = z.infer<typeof alertEventStatusSchema>;
export type AlertEventType = z.infer<typeof alertEventTypeSchema>;
