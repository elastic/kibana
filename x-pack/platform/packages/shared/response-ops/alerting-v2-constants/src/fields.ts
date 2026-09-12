/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Field names for the alert lifecycle object stored in `.rule-events`.
 *
 * Values are currently `'episode.*'` — they will be flipped to `'alert.*'` atomically
 * in PR 4 (the storage cutover). All readers go through these constants so that flip
 * is a 5-line change in this file only.
 */

/** `episode.id` in `.rule-events` — the primary identifier of an alert lifecycle object. */
export const ALERT_ID_FIELD = 'episode.id' as const;

/** `episode.status` in `.rule-events` — lifecycle state (`inactive` | `pending` | `active` | `recovering`). */
export const ALERT_STATUS_FIELD = 'episode.status' as const;

/** `episode.status_count` in `.rule-events` — monotonically-increasing counter for status transitions. */
export const ALERT_STATUS_COUNT_FIELD = 'episode.status_count' as const;

/**
 * Field names for the alert action record stored in `.alert-actions`.
 *
 * These are flat (non-nested) field names, unlike the nested `episode.*` fields above.
 * They will be renamed `alert_id` / `alert_status` in PR 4 alongside the storage cutover.
 */

/** `episode_id` in `.alert-actions` — cross-reference to the alert lifecycle object. */
export const ALERT_ACTION_ALERT_ID_FIELD = 'episode_id' as const;

/** `episode_status` in `.alert-actions` — snapshot of the alert status at action time. */
export const ALERT_ACTION_ALERT_STATUS_FIELD = 'episode_status' as const;
