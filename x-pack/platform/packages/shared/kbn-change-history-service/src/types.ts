/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogChangeHistoryOptions, ObjectChange } from '@kbn/change-history';
import type { TrackUserActionParams } from '@kbn/core-user-activity-server';

/**
 * Callback used to emit a Kibana user-activity log entry. Matches
 * `coreSetup.userActivity.trackUserAction` from `@kbn/core-user-activity-server`.
 */
export type TrackUserAction = (params: TrackUserActionParams) => void;

/**
 * Optional user-activity payload attached to a {@link DualWriteObjectChange}.
 *
 * Presence of this block opts the change into the Kibana user activity log: when the
 * {@link ChangeHistoryServiceClient} was constructed with a `trackUserAction` callback,
 * one activity entry is emitted per change. The two sinks are peers: the activity entry
 * is emitted even when the change-history write is skipped (uninitialized sink,
 * `writeHistory: false`) or fails. Absence means change-history-only — system-initiated
 * writes simply don't attach it.
 *
 * This block is NEVER forwarded to `@kbn/change-history` and is never persisted in the
 * change history document.
 */
export type DualWriteUserActivity = Pick<
  TrackUserActionParams,
  'message' | 'event' | 'object' | 'metadata'
>;

/**
 * An {@link ObjectChange} that may additionally carry a {@link DualWriteUserActivity}
 * block destined for the Kibana user activity log.
 */
export type DualWriteObjectChange = ObjectChange & {
  /** @see {@link DualWriteUserActivity} */
  userActivity?: DualWriteUserActivity;
};

/**
 * Per-call options for {@link ChangeHistoryServiceClient.log} / `logBulk`.
 */
export type DualWriteLogOptions = LogChangeHistoryOptions & {
  /**
   * Set to `false` to skip the change-history write for this call while still emitting
   * user-activity entries for changes that carry a `userActivity` block. Lets callers
   * gate the history sink (feature flags, settings) without gating the whole call.
   * Defaults to `true`.
   */
  writeHistory?: boolean;
};
