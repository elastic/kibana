/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { attachmentDataToDashboardState, dashboardStateToAttachmentData } from './converters';
import type { DashboardAttachmentData } from './types';

// a serialized dashboard writes out unset keys as undefined, which attachment data never holds
// once persisted, and `areEqual` tells an undefined key apart from a missing one
const omitUndefinedKeys = <Value>(value: Value): Value => {
  if (Array.isArray(value)) {
    return value.map(omitUndefinedKeys) as Value;
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, omitUndefinedKeys(entryValue)])
    ) as Value;
  }
  return value;
};

/**
 * The dashboard state and the attachment data below in the same form, so that the dashboard
 * plugin's `areEqual` finds them equal when applying the attachment would not change the dashboard.
 */
export const getComparableDashboardState = (state: DashboardState): DashboardState => {
  const { esql_approximation: esqlApproximation, ...comparableState } = omitUndefinedKeys(
    attachmentDataToDashboardState(dashboardStateToAttachmentData(state))
  );
  // the dashboard writes out approximation turned off, which an attachment leaves unset
  return esqlApproximation ? { ...comparableState, esql_approximation: true } : comparableState;
};

// attachment version data is immutable and every dashboard snapshot is compared with every version
const comparableAttachmentStateCache = new WeakMap<DashboardAttachmentData, DashboardState>();

// the Lens comparator deep-compares API configs, and the dashboard serializes them through the Lens
// builder, which writes out the defaults the agent leaves out
export const getComparableAttachmentState = (data: DashboardAttachmentData): DashboardState => {
  const cachedState = comparableAttachmentStateCache.get(data);
  if (cachedState) {
    return cachedState;
  }
  const comparableState = getComparableDashboardState(attachmentDataToDashboardState(data));
  comparableAttachmentStateCache.set(data, comparableState);
  return comparableState;
};
