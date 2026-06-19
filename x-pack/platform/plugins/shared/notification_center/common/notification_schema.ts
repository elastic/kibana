/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * The canonical notification document, as stored in the `.kibana-notification-center`
 * data stream. Documents are append-only and immutable; per-user state (read,
 * subscriptions, horizons) lives separately in `core.userStorage`.
 */
export const notificationSchema = z
  .object({
    /** Ingest time, ISO 8601. Drives ordering and severity-based retention. */
    '@timestamp': z.iso.datetime(),
    /**
     * Deterministic idempotency key. Re-pushing the same `notification_id`
     * collapses to a single entry at query time (no upsert). See the ID
     * conventions in `notification_id.ts`.
     */
    notification_id: z.string().min(1),
    /** Timestamp of the notification event, ISO 8601. */
    event_timestamp: z.iso.datetime(),
    /** Registered notification type id, e.g. `modelStatus`. */
    type: z.string().min(1),
    /** Short, human-readable headline. */
    title: z.string().min(1),
    /** Longer human-readable body. */
    body: z.string().min(1),
    /** App id of the producing application, e.g. `inference`. */
    source_app_id: z.string().min(1),
    /**
     * Producer-owned identifier for the underlying entity/event this
     * notification is about (e.g. an inference endpoint id). Optional.
     */
    external_id: z.string().min(1).optional(),
  })
  .strict();
