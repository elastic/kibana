/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { attachmentDataToDashboardState, dashboardStateToAttachmentData } from './converters';
import type { DashboardAttachmentData } from './types';

/**
 * The dashboard state and the attachment data below in the same form, so that the dashboard API's
 * `diffStates` finds no changes when applying the attachment would not change the dashboard.
 */
export const getComparableDashboardState = (state: DashboardState): DashboardState =>
  attachmentDataToDashboardState(dashboardStateToAttachmentData(state));

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
