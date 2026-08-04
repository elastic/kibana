/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { UserStorageServiceSetup } from '@kbn/core-user-storage-server';

/**
 * Register the user storage keys needed for Notification Center.
 * This is used to track whether users have marked notifications as read.
 */

/** Timestamp marker: notifications at or before it are read; also used to ensure
 * new users are not flooded with notifications.
 */
export const READ_ALL_BEFORE_KEY = 'notificationCenter:readAllBefore';

/** Individually-read ids newer than `readAllBefore`;
 * advancing the readAllBefore marker keeps this within a reasonable size.
 */
export const READ_KEY = 'notificationCenter:read';

/** userStorage doesn't allow null defaults for key values, so we use this default to represent an unset state. */
export const READ_ALL_BEFORE_DEFAULT = '1970-01-01T00:00:00.000Z';

/** Ceiling for the array of read ids */
const MAX_READ_IDS = 500;

export const readAllBeforeSchema = z.iso.datetime();
export const readSchema = z.array(z.string()).max(MAX_READ_IDS);

/** Registers the read-state keys; core throws on a duplicate key, so call once. */
export const registerNotificationUserStorage = (userStorage: UserStorageServiceSetup) => {
  userStorage.register({
    [READ_ALL_BEFORE_KEY]: {
      schema: readAllBeforeSchema,
      defaultValue: READ_ALL_BEFORE_DEFAULT,
      scope: 'global',
    },
    [READ_KEY]: {
      schema: readSchema,
      defaultValue: [],
      scope: 'global',
    },
  });
};
