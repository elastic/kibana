/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, isPlainObject, omit, sortBy } from 'lodash';
import { attachmentDataToDashboardState, dashboardStateToAttachmentData } from './converters';
import type { DashboardAttachmentData } from './types';

// an empty array means the same as a missing key, and the dashboard omits or adds them freely
const omitEmptyArrays = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(omitEmptyArrays);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => !(Array.isArray(entry) && entry.length === 0))
      .map(([key, entry]) => [key, omitEmptyArrays(entry)])
  );
};

// the dashboard history sorts panels by id, so undo can bring them back in a different order
const sortPanelsById = <Panel extends { id?: string; panels?: unknown[] }>(
  panels: Panel[] = []
): Panel[] =>
  sortBy(panels, ({ id }) => id).map((panel) =>
    Array.isArray(panel.panels)
      ? { ...panel, panels: sortBy(panel.panels as Array<{ id?: string }>, ({ id }) => id) }
      : panel
  );

/**
 * Brings attachment data to the form the dashboard serializes it in: the converter round trip
 * fills in the Lens API defaults, and the dashboard drops the time range mode, defaults
 * ES|QL approximation and fills in the access control on save, which the agent never edits.
 */
const toComparableDashboardData = (data: DashboardAttachmentData): unknown => {
  const {
    esql_approximation = false,
    time_range,
    ...rest
  } = omit(dashboardStateToAttachmentData(attachmentDataToDashboardState(data)), 'access_control');
  return omitEmptyArrays({
    ...rest,
    panels: sortPanelsById(rest.panels),
    pinned_panels: sortPanelsById(rest.pinned_panels),
    esql_approximation,
    ...(time_range && { time_range: omit(time_range, 'mode') }),
  });
};

/**
 * Whether two dashboard attachment data describe the same dashboard, ignoring what the dashboard
 * adds or drops when it serializes the state.
 */
export const isSameDashboardContent = (
  left: DashboardAttachmentData,
  right: DashboardAttachmentData
): boolean => isEqual(toComparableDashboardData(left), toComparableDashboardData(right));
