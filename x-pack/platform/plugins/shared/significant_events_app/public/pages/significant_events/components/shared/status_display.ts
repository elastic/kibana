/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventStatus } from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_STATUS_OPTIONS } from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_STATUS_COLORS } from './constants';
import { SIGNIFICANT_EVENT_STATUS_LABELS } from './translations';

// Detections carry no lifecycle state — a detection's change_point_type is never mapped here.
export type LifecycleDisplayStatus = SignificantEventStatus;

export const isSignificantEventStatus = (status: string): status is SignificantEventStatus =>
  (SIGNIFICANT_EVENT_STATUS_OPTIONS as ReadonlyArray<string>).includes(status);

export const getSignificantEventStatusColor = (status: string): string =>
  isSignificantEventStatus(status) ? SIGNIFICANT_EVENT_STATUS_COLORS[status] : 'default';

export const getLifecycleStatusLabel = (status: LifecycleDisplayStatus): string => {
  switch (status) {
    case 'open':
    case 'closed':
    case 'dismissed':
      return SIGNIFICANT_EVENT_STATUS_LABELS[status];
    default:
      return status;
  }
};

export const getLifecycleStatusColor = (status: LifecycleDisplayStatus): string => {
  switch (status) {
    case 'open':
    case 'closed':
    case 'dismissed':
      return SIGNIFICANT_EVENT_STATUS_COLORS[status];
    default:
      return 'hollow';
  }
};
