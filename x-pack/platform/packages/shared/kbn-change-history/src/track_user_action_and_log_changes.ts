/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { TrackUserActionParams } from '@kbn/core-user-activity-server';

export interface TrackUserActionAndLogChangesParams {
  /**
   * Writes the change-history entries (e.g. `changeHistoryClient.logBulk(...)`).
   * Awaited before any user-activity event is emitted. A rejection is logged and
   * swallowed — it never propagates to the caller and does not suppress the
   * user-activity events, since those describe the (already successful) user
   * action rather than the history write.
   */
  logChanges: () => Promise<void>;
  /**
   * Core user-activity tracker (`coreSetup.userActivity.trackUserAction`).
   * When absent only the change-history write runs.
   */
  trackUserAction?: (params: TrackUserActionParams) => void;
  /**
   * Pre-built user-activity events, typically one per affected object. Callers
   * build these explicitly so nothing snapshot-derived can leak into the
   * activity log implicitly. An empty array skips user-activity emission.
   */
  activityEvents: TrackUserActionParams[];
  logger: Logger;
}

/**
 * Single instrumentation call for producers that record both a change-history
 * entry and Kibana user activity for the same mutation. Failures on either
 * destination are isolated: they are logged and never thrown, and one
 * destination failing does not prevent the other from being written.
 */
export async function trackUserActionAndLogChanges({
  logChanges,
  trackUserAction,
  activityEvents,
  logger,
}: TrackUserActionAndLogChangesParams): Promise<void> {
  try {
    await logChanges();
  } catch (err) {
    logger.warn(`Failed to log change history: ${err}`);
  }

  if (!trackUserAction) {
    return;
  }

  for (const event of activityEvents) {
    try {
      trackUserAction(event);
    } catch (err) {
      logger.warn(`Failed to track user action "${event.event.action}": ${err}`);
    }
  }
}
