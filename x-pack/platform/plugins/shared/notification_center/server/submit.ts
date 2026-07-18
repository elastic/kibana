/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { notificationWriteSchema } from '../common/notification_schema';
import {
  NOTIFICATION_TYPE_FLAGS,
  NOTIFICATION_TYPE_ENABLED_DEFAULT,
} from '../common/feature_flags';
import { notificationTypeId } from '../common/notification_registry_utils';
import type { NotificationDocument } from '../common/types';
import { getNotificationDataStreamClient } from './data_stream/notification_data_stream';
import type {
  NotificationCenterPluginSetup,
  NotificationCenterPluginStart,
  NotificationCenterStartDependencies,
} from './types';

/** Thrown when a submitted draft fails schema validation; nothing is written. */
export class NotificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationValidationError';
  }
}

/**
 * Builds the `submit` producer API: validate the draft, stamp `@timestamp`, and
 * append one document.
 */
export const buildSubmitNotification =
  (
    core: CoreSetup<NotificationCenterStartDependencies, NotificationCenterPluginStart>
  ): NotificationCenterPluginSetup['submitNotification'] =>
  async (draft) => {
    const parsed = notificationWriteSchema.safeParse(draft);
    if (!parsed.success) {
      throw new NotificationValidationError(parsed.error.message);
    }

    const { namespace, type } = parsed.data;
    const [{ dataStreams, featureFlags }] = await core.getStartServices();

    // A notification type without a flag defined in the registry will pass through.
    const flagKey = NOTIFICATION_TYPE_FLAGS[notificationTypeId(namespace, type)];
    const enabled = flagKey
      ? await featureFlags.getBooleanValue(flagKey, NOTIFICATION_TYPE_ENABLED_DEFAULT)
      : true;
    if (!enabled) {
      return { status: 'skipped_disabled' };
    }

    const document: NotificationDocument = {
      ...parsed.data,
      '@timestamp': new Date().toISOString(),
    };

    // Core caches one client per data stream name, so resolve it at the write site.
    const client = await getNotificationDataStreamClient(dataStreams);

    const response = await client.create({ documents: [document] });
    if (response.errors) {
      const reason = response.items[0]?.create?.error?.reason ?? 'unknown error';
      throw new Error(`Failed to append notification: ${reason}`);
    }

    return { status: 'submitted' };
  };
