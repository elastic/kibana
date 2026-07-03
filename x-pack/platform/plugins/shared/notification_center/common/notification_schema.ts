/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { isInternalURL } from '@kbn/std';

/** Severity tiers, low→high; array order is load-bearing for retention. */
export const SEVERITIES = ['info', 'warning', 'error', 'critical'] as const;

/** Call-to-action: an internal link and its display text. */
export const ctaSchema = z
  .object({
    /** Internal Kibana path; off-origin URLs are rejected (open-redirect guard). */
    link: z
      .string()
      .min(1)
      .max(200)
      .refine((value) => value.startsWith('/') && isInternalURL(value), {
        message: 'link must be an internal path starting with a single "/"',
      }),
    linkText: z.string().min(1).max(200),
  })
  .strict();

/**
 * Write contract: the shape a producer submits. `strict()` rejects unknown
 * fields and typos. No `@timestamp` — NC stamps ingest time on write; producers
 * express event time via `event_timestamp`.
 */
export const notificationWriteSchema = z
  .object({
    /** Idempotency key; see notification_id.ts for the ID conventions. */
    notification_id: z.string().min(1).max(512),
    event_timestamp: z.iso.datetime(),
    /** Registered notification type, e.g. `inferenceModelStatus`. */
    type: z.string().min(1).max(64),
    title: z.string().min(1).max(256),
    description: z.string().min(1).max(2000),
    /** App id of the producing application, e.g. `inference`. */
    source_app_id: z.string().min(1).max(64),
    severity: z.enum(SEVERITIES).default('info'),
    cta: ctaSchema.optional(),
  })
  .strict();

/**
 * Read contract for stored documents: the write contract plus `@timestamp`.
 * Deliberately more permissive than the write schema so a node can read docs
 * written by a newer node during an upgrade — `loose()` tolerates unknown
 * fields; severity `.catch('info')` survives unknown future tiers. Add future
 * fields as `.optional()` on the write side so older docs still validate here.
 */
export const notificationReadSchema = notificationWriteSchema
  .extend({
    /** Ingest time, stamped on write by NC — never producer-supplied. */
    '@timestamp': z.iso.datetime(),
    severity: z.enum(SEVERITIES).default('info').catch('info'),
  })
  .loose();
