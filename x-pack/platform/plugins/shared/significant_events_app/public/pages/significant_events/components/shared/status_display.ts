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

export const isSignificantEventStatus = (status: string): status is SignificantEventStatus =>
  (SIGNIFICANT_EVENT_STATUS_OPTIONS as ReadonlyArray<string>).includes(status);

export const getSignificantEventStatusColor = (
  status: string,
  fallback: string = 'default'
): string =>
  isSignificantEventStatus(status) ? SIGNIFICANT_EVENT_STATUS_COLORS[status] : fallback;

export const getLifecycleStatusLabel = (status: SignificantEventStatus): string =>
  SIGNIFICANT_EVENT_STATUS_LABELS[status] ?? status;

/** Timeline markers use hollow for unknown/missing statuses. */
export const getLifecycleStatusColor = (status: SignificantEventStatus): string =>
  getSignificantEventStatusColor(status, 'hollow');
