/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ALERT_EPISODE_STATUS } from './alert_action_schema';
import {
  ID_MAX_LENGTH,
  MAX_ALERT_EVENT_DATA_KEYS,
  MAX_FIELD_NAME_LENGTH,
  MAX_FINGERPRINT_FIELDS,
  MAX_FINGERPRINT_LENGTH,
} from './constants';

export const alertEventSeveritySchema = z.enum(['info', 'low', 'medium', 'high', 'critical']);

/**
 * Same four lifecycle states as {@link ALERT_EPISODE_STATUS} / alert_events.ts.
 * All can be set explicitly by external callers; when omitted, status defaults to active.
 */
const externalAlertStatusSchema = z.enum([
  ALERT_EPISODE_STATUS.ACTIVE,
  ALERT_EPISODE_STATUS.INACTIVE,
  ALERT_EPISODE_STATUS.PENDING,
  ALERT_EPISODE_STATUS.RECOVERING,
]);

const RESERVED_SOURCE_PREFIX = 'elastic';

/**
 * Source field that rejects the reserved `elastic*` prefix.
 * Used by external-facing schemas (workflow steps, future HTTP routes) so that
 * vendors cannot claim an Elastic-owned source.
 */
const externalSourceSchema = z
  .string()
  .min(1)
  .max(ID_MAX_LENGTH)
  .refine((v) => !v.startsWith(RESERVED_SOURCE_PREFIX), {
    message:
      'source cannot start with "elastic" — this prefix is reserved for Elastic-produced events.',
  });

/**
 * Source field without the `elastic*` restriction.
 * Used on the plugin client path (`AlertEventsClient.createAlertEvent`) so that
 * first-party Kibana plugins can write Elastic-sourced events directly.
 */
const internalSourceSchema = z.string().min(1).max(ID_MAX_LENGTH);

/**
 * Shared request-body fields (no `source`).
 *
 * Closed object (`.strict()`): unknown top-level keys are rejected. Callers put
 * vendor-specific dimensions under `data` and name them in `fingerprint_fields`
 * (resolved only under `data`, e.g. `monitor_id` or `labels.env`). Top-level
 * identity uses `fingerprint` or `rule_id` instead.
 *
 * Display name / backlink are not first-class request fields — callers who
 * want them put `rule_name` / `alert_url` inside `data`. The UI reads those
 * keys when present.
 */
const createAlertEventBodyBaseObjectSchema = z
  .object({
    // At least one of fingerprint / fingerprint_fields / rule_id is required
    // (enforced by .superRefine below). Priority when resolving the series key:
    // fingerprint > fingerprint_fields > rule_id (hashed with source).
    fingerprint: z.string().min(1).max(MAX_FINGERPRINT_LENGTH).optional(),
    fingerprint_fields: z
      .array(z.string().min(1).max(MAX_FIELD_NAME_LENGTH))
      .min(1)
      .max(MAX_FINGERPRINT_FIELDS)
      .optional(),
    rule_id: z.string().min(1).max(ID_MAX_LENGTH).optional(),

    alert_status: externalAlertStatusSchema.optional(),
    data: z
      .record(z.string().max(MAX_FIELD_NAME_LENGTH), z.any())
      .optional()
      .superRefine((data, ctx) => {
        if (data != null && Object.keys(data).length > MAX_ALERT_EVENT_DATA_KEYS) {
          ctx.addIssue({
            code: 'custom',
            message: `data must have at most ${MAX_ALERT_EVENT_DATA_KEYS} keys`,
          });
        }
      }),
    timestamp: z.iso.datetime().optional(),
    severity: alertEventSeveritySchema.optional(),
  })
  .strict();

const refineIdentityFields = (
  body: z.infer<typeof createAlertEventBodyBaseObjectSchema>,
  ctx: z.RefinementCtx
) => {
  if (!body.fingerprint && !body.fingerprint_fields?.length && !body.rule_id) {
    ctx.addIssue({
      code: 'custom',
      message:
        'one of fingerprint, fingerprint_fields, or rule_id is required to establish a stable series identity',
      path: ['fingerprint'],
    });
  }
};

/**
 * HTTP edge only — POST /api/alerting/v2/alerts/:source request body.
 * `source` is supplied by the path; the route merges it before calling the client.
 * Do not use this type inward of the route layer.
 */
export const createAlertEventPathBodySchema =
  createAlertEventBodyBaseObjectSchema.superRefine(refineIdentityFields);

/**
 * Canonical create-alert payload for external callers (source required, `elastic*` rejected).
 * Used by workflow steps and any future HTTP routes so vendors cannot claim Elastic sources.
 * Prefer {@link internalCreateAlertEventDataSchema} for first-party plugin code.
 */
export const createAlertEventDataSchema = createAlertEventBodyBaseObjectSchema
  .extend({
    source: externalSourceSchema,
  })
  .strict()
  .superRefine(refineIdentityFields);

/**
 * Canonical create-alert payload for internal Kibana plugin callers.
 * Identical to {@link createAlertEventDataSchema} but allows `elastic*` sources
 * so first-party plugins (e.g. Security Solution) can use their natural source names.
 * Never use this at an HTTP or workflow boundary — the `elastic*` restriction on those
 * paths prevents vendors from impersonating Elastic-owned sources.
 */
export const internalCreateAlertEventDataSchema = createAlertEventBodyBaseObjectSchema
  .extend({
    source: internalSourceSchema,
  })
  .strict()
  .superRefine(refineIdentityFields);

/** Path params for POST /api/alerting/v2/alerts/:source */
export const createAlertEventSourceParamsSchema = z.object({
  source: externalSourceSchema.describe(
    'The external source system that produced the alert event (for example, "datadog"). Cannot start with "elastic".'
  ),
});

export const createAlertEventResponseSchema = z.object({
  group_hash: z.string(),
  episode_id: z.string(),
});

/** Normalized ingest payload — `source` is always present past the HTTP edge. */
export type CreateAlertEventData = z.infer<typeof createAlertEventDataSchema>;
export type CreateAlertEventResponse = z.infer<typeof createAlertEventResponseSchema>;
