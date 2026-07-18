/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  notificationWriteSchema,
  notificationReadSchema,
  ctaSchema,
} from './notification_schema';
import type { NotificationTypeRef } from './notification_registry_utils';

/** A stored notification (read contract); the shape the app programs against. */
export type Notification = z.infer<typeof notificationReadSchema>;

/**
 * Producer submit input.
 * `namespace` and `type` are replaced by the typed pair from NotificationTypeRef,
 * so a type from the wrong namespace does not typecheck.
 */
export type NotificationInput = Omit<
  z.input<typeof notificationWriteSchema>,
  'namespace' | 'type'
> &
  NotificationTypeRef;

/**
 * The exact document shape in the NC index: validated write payload (`severity` resolved) plus
 * the `@timestamp` generated during write by the NC plugin.
 */
export type NotificationDocument = z.output<typeof notificationWriteSchema> & {
  '@timestamp': string;
};

export type Severity = Notification['severity'];

export type Cta = z.infer<typeof ctaSchema>;
