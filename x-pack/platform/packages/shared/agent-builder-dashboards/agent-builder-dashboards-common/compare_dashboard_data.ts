/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { attachmentDataToDashboardState, dashboardStateToAttachmentData } from './converters';
import { DEFAULT_TIME_RANGE } from './dashboard_state_helpers';
import type { DashboardAttachmentData } from './types';

// the time applying an attachment fills in for the keys it leaves out means the same as a missing key
const withoutAppliedTimeDefaults = ({
  time_range: timeRange,
  refresh_interval: refreshInterval,
  ...state
}: DashboardState): DashboardState => ({
  ...state,
  ...(timeRange &&
    !(timeRange.from === DEFAULT_TIME_RANGE.from && timeRange.to === DEFAULT_TIME_RANGE.to) && {
      time_range: timeRange,
    }),
  // a paused refresh interval does nothing, whatever its value
  ...(refreshInterval && !refreshInterval.pause && { refresh_interval: refreshInterval }),
});

/**
 * The dashboard state and the attachment data below in the same form, so that the dashboard API's
 * `diffStates` finds no changes when applying the attachment would not change the dashboard.
 */
export const getComparableDashboardState = (state: DashboardState): DashboardState =>
  withoutAppliedTimeDefaults(attachmentDataToDashboardState(dashboardStateToAttachmentData(state)));

// attachment version data is immutable and every dashboard snapshot is compared with every version
const comparableAttachmentStateCache = new WeakMap<DashboardAttachmentData, DashboardState>();

// the Lens comparator deep-compares API configs, and the dashboard serializes them through the Lens
// builder, which writes out the defaults the agent leaves out
export const getComparableAttachmentState = (data: DashboardAttachmentData): DashboardState => {
  const comparableState =
    comparableAttachmentStateCache.get(data) ??
    getComparableDashboardState(attachmentDataToDashboardState(data));
  comparableAttachmentStateCache.set(data, comparableState);
  return comparableState;
};
