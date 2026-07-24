/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NotificationNamespace,
  NotificationTypeName,
  NotificationKindOf,
} from '../common/notification_registry_utils';
import type { NotificationSubmitInput } from '../common/types';

/**
 * Outcome of a `submit` call. `skipped_disabled` means the notification was valid
 * but its type's feature flag is off, so nothing was written.
 */
export interface SubmitNotificationResult {
  status: 'submitted' | 'skipped_disabled';
}

/**
 * A submitter bound to one registered `(namespace, type)`, returned by
 * {@link NotificationCenterPluginSetup.forType}.
 */
export interface NotificationSubmitter<
  N extends NotificationNamespace,
  T extends NotificationTypeName<N>
> {
  /**
   * Validate the content, check the type's feature flag, build the `notification_id` from the
   * type's `kind`, stamp `@timestamp`, and append one document to the
   * `.kibana-notification-center` data stream.
   */
  submit: (input: NotificationSubmitInput<N, T>) => Promise<SubmitNotificationResult>;
}

/** Public server-side setup contract. */
export interface NotificationCenterPluginSetup {
  /**
   * Bind a submitter to a registered notification type. The `ref` is a `NOTIFICATION_TYPES` leaf
   * (`NOTIFICATION_TYPES.<namespace>.<type>`), which carries the registry `kind` so the id scheme is
   * fixed without a runtime lookup. The returned `submit` takes only the notification content and
   * the type's id parts (`namespace`, `type`, and the id come from NC).
   */
  forType: <N extends NotificationNamespace, T extends NotificationTypeName<N>>(ref: {
    namespace: N;
    type: T;
    kind: NotificationKindOf<N, T>;
  }) => NotificationSubmitter<N, T>;
}

export type NotificationCenterPluginStart = Record<string, never>;

export type NotificationCenterSetupDependencies = Record<string, never>;

export type NotificationCenterStartDependencies = Record<string, never>;
