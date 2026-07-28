/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { isInternalURL } from '@kbn/std';
import {
  NOTIFICATION_NAMESPACES,
  isRegisteredNotificationRef,
} from './notification_registry_utils';

/** Severity members, exported so producers reference `SEVERITY.warning` rather than a raw string. */
export const SEVERITY = {
  info: 'info',
  warning: 'warning',
  error: 'error',
  critical: 'critical',
} as const;

/** Severity tiers, low→high; array order is load-bearing for retention. */
export const SEVERITIES = [
  SEVERITY.info,
  SEVERITY.warning,
  SEVERITY.error,
  SEVERITY.critical,
] as const;

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
 * Field shape shared by the write and read schemas. `namespace` and `type` are
 * both drawn from the notification registry
 */
const notificationObject = z
  .object({
    /** Idempotency key; see notification_id.ts for the ID conventions. */
    notification_id: z.string().min(1).max(512),
    /** Occurrence time, set by NC for `timeseries` notification kind */
    event_timestamp: z.iso.datetime().optional(),
    /** Registry namespace that owns this notification, e.g. `inference`. */
    namespace: z.enum(NOTIFICATION_NAMESPACES),
    /** Registry type within `namespace`, e.g. `modelStatus` */
    type: z.string().min(1).max(64),
    title: z.string().min(1).max(256),
    description: z.string().min(1).max(2000),
    severity: z.enum(SEVERITIES).default('info'),
    cta: ctaSchema.optional(),
  })
  .strict();

/**
 * The assembled write payload, validated before append.
 * The `(namespace, type)` pair must be registered in the NOTIFICATION_REGISTRY.
 */
export const notificationWriteSchema = notificationObject.superRefine((value, ctx) => {
  if (!isRegisteredNotificationRef(value.namespace, value.type)) {
    ctx.addIssue({
      code: 'custom',
      path: ['type'],
      message: `type "${value.type}" is not registered under namespace "${value.namespace}"`,
    });
  }
});

/**
 * Shape of a notification stored in the NC index.
 * `loose()` ensures reads don't fail for outdated documents.
 */
export const notificationReadSchema = notificationObject
  .extend({
    /** Ingest time, stamped on write by NC — never producer-supplied. */
    '@timestamp': z.iso.datetime(),
    namespace: z.string().min(1).max(64),
    type: z.string().min(1).max(64),
    // Catch unknown severity tiers that may be added in the future
    severity: z.enum(SEVERITIES).default('info').catch('info'),
  })
  .loose();
