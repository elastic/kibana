/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Discovery, SignificantEventStatus } from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_STATUS_OPTIONS } from '@kbn/significant-events-schema';
import { DISCOVERY_KIND_COLORS, SIGNIFICANT_EVENT_STATUS_COLORS } from './constants';
import { DISCOVERY_KIND_LABELS, SIGNIFICANT_EVENT_STATUS_LABELS } from './translations';

// Lifecycle display covers ONLY event-sourced states: discovery kinds (discovery/clearance)
// and significant-event statuses. Detections carry no lifecycle — a detection's
// change_point_type is never mapped to a lifecycle status here.
export type LifecycleDisplayStatus = Exclude<Discovery['kind'] | SignificantEventStatus, 'handled'>;

export const isSignificantEventStatus = (status: string): status is SignificantEventStatus =>
  (SIGNIFICANT_EVENT_STATUS_OPTIONS as ReadonlyArray<string>).includes(status);

export const getSignificantEventStatusColor = (status: string): string =>
  isSignificantEventStatus(status) ? SIGNIFICANT_EVENT_STATUS_COLORS[status] : 'default';

export const isVisibleDiscoveryKind = (
  kind: Discovery['kind']
): kind is Exclude<Discovery['kind'], 'handled'> => kind !== 'handled';

export const getLifecycleStatusLabel = (status: LifecycleDisplayStatus): string => {
  switch (status) {
    case 'discovery':
    case 'clearance':
      return DISCOVERY_KIND_LABELS[status];
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
    case 'discovery':
    case 'clearance':
      return DISCOVERY_KIND_COLORS[status];
    case 'open':
    case 'closed':
    case 'dismissed':
      return SIGNIFICANT_EVENT_STATUS_COLORS[status];
    default:
      return 'hollow';
  }
};
