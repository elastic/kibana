/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationInput } from '../common/types';

/**
 * Outcome of a `submitNotification` call. `skipped_disabled` means the draft was
 * valid but its notification type's feature flag is off, so nothing was written.
 */
export interface SubmitNotificationResult {
  status: 'submitted' | 'skipped_disabled';
}

/** Public server-side setup contract. */
export interface NotificationCenterPluginSetup {
  /**
   * Validate a draft, check its notification type's feature flag,
   * stamp `@timestamp` and append it to the `.kibana-notification-center`
   * data stream.
   */
  submitNotification: (draft: NotificationInput) => Promise<SubmitNotificationResult>;
}

export type NotificationCenterPluginStart = Record<string, never>;

export type NotificationCenterSetupDependencies = Record<string, never>;

export type NotificationCenterStartDependencies = Record<string, never>;
