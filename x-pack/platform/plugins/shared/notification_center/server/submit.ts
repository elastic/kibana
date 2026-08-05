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
import { joinNotificationTypeId } from '../common/notification_registry_utils';
import type { NotificationKind } from '../common/notification_registry_types';
import { buildStateNotificationId, buildTimeseriesNotificationId } from '../common/notification_id';
import type {
  NotificationDocument,
  NotificationDraft,
  StateSubmitIdParts,
  TimeseriesSubmitIdParts,
} from '../common/types';
import { getNotificationDataStreamClient } from './data_stream/notification_data_stream';
import type {
  NotificationCenterPluginSetup,
  NotificationCenterPluginStart,
  NotificationCenterStartDependencies,
  SubmitNotificationResult,
} from './types';

type NotificationCenterCore = CoreSetup<
  NotificationCenterStartDependencies,
  NotificationCenterPluginStart
>;

/** Thrown when a submission fails schema validation; nothing is written. */
export class NotificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationValidationError';
  }
}

/** Validate a draft, gate on its type's feature flag, stamp `@timestamp`, and append one document. */
const writeNotification = async (
  core: NotificationCenterCore,
  draft: NotificationDraft
): Promise<SubmitNotificationResult> => {
  const parsed = notificationWriteSchema.safeParse(draft);
  if (!parsed.success) {
    throw new NotificationValidationError(parsed.error.message);
  }

  const { namespace, type } = parsed.data;
  const [{ dataStreams, featureFlags }] = await core.getStartServices();

  // A notification type without a flag defined in the registry passes through.
  const flagKey = NOTIFICATION_TYPE_FLAGS[joinNotificationTypeId(namespace, type)];
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

/**
 * Build the `notification_id` and, for `timeseries` notification kind, the `event_timestamp` for a submission.
 * A payload missing the parts that the notification kind requires is rejected before anything is written.
 * `state` kinds of notifications require an entity and state.
 * `timeseries` kinds of notifications require an event and epochMs.
 */
export const buildIdAndTimestamp = (
  kind: NotificationKind,
  namespace: string,
  type: string,
  idParts: StateSubmitIdParts | TimeseriesSubmitIdParts
): { notification_id: string; event_timestamp?: string } => {
  if (kind === 'timeseries') {
    if (!('epochMs' in idParts)) {
      throw new NotificationValidationError(
        `"${joinNotificationTypeId(
          namespace,
          type
        )}" is a timeseries type; submit requires event and epochMs`
      );
    }
    const { event, epochMs } = idParts;
    return {
      notification_id: buildTimeseriesNotificationId({ namespace, type, event, epochMs }),
      event_timestamp: new Date(epochMs).toISOString(),
    };
  }

  if (!('entity' in idParts)) {
    throw new NotificationValidationError(
      `"${joinNotificationTypeId(
        namespace,
        type
      )}" is a state type; submit requires entity and state`
    );
  }
  const { entity, state } = idParts;
  return { notification_id: buildStateNotificationId({ namespace, type, entity, state }) };
};

/**
 * Build the `forType` producer API: bind a submitter to a registered `(namespace, type)` whose
 * `submit` builds the `notification_id` from the type's registry `kind`. This keeps NC in charge of
 * logic around how notifications are stored and displayed, while making it easier and more readable
 * for producers to submit notifications.
 */
export const buildForType =
  (core: NotificationCenterCore): NotificationCenterPluginSetup['forType'] =>
  ({ namespace, type, kind }) => ({
    submit: (input) => {
      const { title, description, severity, cta } = input;
      const { notification_id, event_timestamp } = buildIdAndTimestamp(
        kind,
        namespace,
        type,
        input
      );

      return writeNotification(core, {
        notification_id,
        namespace,
        type,
        title,
        description,
        severity,
        cta,
        ...(event_timestamp && { event_timestamp }),
      });
    },
  });
