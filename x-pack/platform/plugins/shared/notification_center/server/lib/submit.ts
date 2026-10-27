/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { inject, injectable } from 'inversify';
import { CoreStart, InternalElasticsearchClient } from '@kbn/core-di-server';
import type { ElasticsearchClient, FeatureFlagsStart } from '@kbn/core/server';
import { notificationWriteSchema } from '../../common/notification_schema';
import {
  NOTIFICATION_TYPE_FLAGS,
  NOTIFICATION_TYPE_ENABLED_DEFAULT,
} from '../../common/feature_flags';
import {
  joinNotificationTypeId,
  type NotificationNamespace,
} from '../../common/notification_registry_utils';
import type { NotificationKind } from '../../common/notification_registry_types';
import {
  buildStateNotificationId,
  buildTimeseriesNotificationId,
} from '../../common/notification_id';
import type {
  NotificationContent,
  NotificationDocument,
  NotificationDraft,
  StateSubmitIdParts,
  TimeseriesSubmitIdParts,
} from '../../common/types';
import { NOTIFICATION_DATA_STREAM_NAME } from '../storage/notification_data_stream';
import type { SubmitNotificationResult } from '../types';
import { NotificationValidationError } from './notification_validation_error';

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

/** A registered `(namespace, type)` pair with the registry `kind` that fixes its id scheme. */
export interface NotificationTypeTarget {
  namespace: NotificationNamespace;
  type: string;
  kind: NotificationKind;
}

export type NotificationSubmitPayload = NotificationContent &
  (StateSubmitIdParts | TimeseriesSubmitIdParts);

/**
 * Writes producer submissions into the backing data stream. NC stays in charge of the id scheme and
 * storage layout; producers supply only the content and the type's id parts.
 */
@injectable()
export class NotificationSubmitService {
  constructor(
    @inject(InternalElasticsearchClient) private readonly esClient: ElasticsearchClient,
    @inject(CoreStart('featureFlags')) private readonly featureFlags: FeatureFlagsStart
  ) {}

  /** Build the `notification_id` from the type's registry `kind`, then validate and write. */
  public submit(
    { namespace, type, kind }: NotificationTypeTarget,
    input: NotificationSubmitPayload
  ): Promise<SubmitNotificationResult> {
    const { title, description, severity, cta } = input;
    const { notification_id: notificationId, event_timestamp: eventTimestamp } =
      buildIdAndTimestamp(kind, namespace, type, input);

    return this.write({
      notification_id: notificationId,
      namespace,
      type,
      title,
      description,
      severity,
      cta,
      ...(eventTimestamp && { event_timestamp: eventTimestamp }),
    });
  }

  /** Validate a draft, gate on its type's feature flag, stamp `@timestamp`, and append one document. */
  private async write(draft: NotificationDraft): Promise<SubmitNotificationResult> {
    const parsed = notificationWriteSchema.safeParse(draft);
    if (!parsed.success) {
      throw new NotificationValidationError(parsed.error.message);
    }

    const { namespace, type } = parsed.data;

    // A notification type without a flag defined in the registry passes through.
    // Risk: this reads only the first emission. If the provider is not initialized
    // yet, that value is the fallback and this submission is not retried when the
    // provider later becomes ready. Later `submit` calls evaluate the flag again,
    // so they use the real value once the provider is initialized.
    const flagKey = NOTIFICATION_TYPE_FLAGS[joinNotificationTypeId(namespace, type)];
    const enabled = flagKey
      ? await firstValueFrom(
          this.featureFlags.getBooleanValue$(flagKey, NOTIFICATION_TYPE_ENABLED_DEFAULT)
        )
      : true;
    if (!enabled) {
      return { status: 'skipped_disabled' };
    }

    const document: NotificationDocument = {
      ...parsed.data,
      '@timestamp': new Date().toISOString(),
    };

    // A data stream accepts only `create`, so append with `op_type` rather than a plain index.
    // A rejected write throws, so there is no response body to inspect.
    await this.esClient.index<NotificationDocument>({
      index: NOTIFICATION_DATA_STREAM_NAME,
      op_type: 'create',
      document,
    });

    return { status: 'submitted' };
  }
}
