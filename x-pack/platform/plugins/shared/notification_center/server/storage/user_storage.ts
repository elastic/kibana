/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { UserStorageServiceSetup } from '@kbn/core-user-storage-server';
import { notificationIdSchema } from '../../common/notification_schema';

/**
 * Register the user storage keys needed for Notification Center.
 * This is used to track whether users have marked notifications as read.
 */

/** Timestamp marker: notifications at or before it are read.
 */
export const READ_ALL_BEFORE_KEY = 'notificationCenter:readAllBefore';

/** Per-id read overrides keyed by `notification_id`.
 * One entry for the read state of any given notification a user has manually marked.
 * Size limited by `MAX_OVERRIDES`. `markAllRead` resets the overrides entirely.
 */
export const OVERRIDES_KEY = 'notificationCenter:overrides';

/** userStorage doesn't allow null defaults for key values, so this stands for an unset marker
 * until a user's first read replaces it.
 */
export const READ_ALL_BEFORE_DEFAULT = '1970-01-01T00:00:00.000Z';

/** Ceiling for the number of per-id read overrides. */
export const MAX_OVERRIDES = 500;

export const readAllBeforeSchema = z.iso.datetime();

/**
 * An override for one notification ID.
 *
 * `read` allows the client to mark the notification as read or unread explicitly.
 * `markedAt` records when the override was written.
 */
export const readOverrideSchema = z
  .object({ read: z.boolean(), markedAt: z.iso.datetime() })
  .strict();

export const overridesSchema = z
  .record(notificationIdSchema, readOverrideSchema)
  .refine((overrides) => Object.keys(overrides).length <= MAX_OVERRIDES, {
    message: `Cannot exceed ${MAX_OVERRIDES} read overrides`,
  });

export type ReadOverride = z.infer<typeof readOverrideSchema>;
export type ReadOverrides = z.infer<typeof overridesSchema>;

/** Registers the read-state keys; core throws on a duplicate key, so call once. */
export const registerNotificationUserStorage = (userStorage: UserStorageServiceSetup) => {
  userStorage.register({
    [READ_ALL_BEFORE_KEY]: {
      schema: readAllBeforeSchema,
      defaultValue: READ_ALL_BEFORE_DEFAULT,
      scope: 'global',
    },
    [OVERRIDES_KEY]: {
      schema: overridesSchema,
      defaultValue: {},
      scope: 'global',
    },
  });
};
