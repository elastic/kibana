/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, isPlainObject, omit, sortBy } from 'lodash';
import { lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { attachmentDataToDashboardState, dashboardStateToAttachmentData } from './converters';
import type { AttachmentPanel, DashboardAttachmentData, DashboardSection } from './types';

// an undefined value or an empty array means the same as a missing key, and the dashboard omits or
// adds them freely
const omitEmptyValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(omitEmptyValues);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined && !(Array.isArray(entry) && entry.length === 0))
      .map(([key, entry]) => [key, omitEmptyValues(entry)])
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

// the dashboard read API validates Lens panels with the Lens API schema, which fills in defaults
// (legend truncation, percent decimals, …) that the agent never writes
const withLensApiDefaults = <Widget extends AttachmentPanel | DashboardSection>(
  widget: Widget
): Widget => {
  if ('panels' in widget) {
    return { ...widget, panels: widget.panels.map(withLensApiDefaults) };
  }
  if (widget.type !== LENS_EMBEDDABLE_TYPE) {
    return widget;
  }
  const parsed = lensApiConfigSchema.safeParse(widget.config);
  return parsed.success ? { ...widget, config: { ...widget.config, ...parsed.data } } : widget;
};

/**
 * Brings attachment data to the form the dashboard serializes it in: the Lens API schema and the
 * converter round trip fill in the Lens defaults, and the dashboard drops the time range mode, defaults
 * ES|QL approximation and fills in the access control on save, which the agent never edits.
 */
const toComparableDashboardData = (data: DashboardAttachmentData): unknown => {
  const {
    esql_approximation = false,
    time_range,
    refresh_interval,
    ...rest
  } = omit(
    dashboardStateToAttachmentData(
      attachmentDataToDashboardState({ ...data, panels: data.panels.map(withLensApiDefaults) })
    ),
    'access_control'
  );
  return omitEmptyValues({
    ...rest,
    panels: sortPanelsById(rest.panels),
    pinned_panels: sortPanelsById(rest.pinned_panels),
    esql_approximation,
    ...(time_range && { time_range: omit(time_range, 'mode') }),
    // a paused refresh interval does nothing, whatever its value
    ...(refresh_interval && !refresh_interval.pause && { refresh_interval }),
  });
};

// attachment version data is immutable, so its comparable form only needs to be computed once
const comparableDataCache = new WeakMap<DashboardAttachmentData, unknown>();

const getComparableDashboardData = (data: DashboardAttachmentData): unknown => {
  if (!comparableDataCache.has(data)) {
    comparableDataCache.set(data, toComparableDashboardData(data));
  }
  return comparableDataCache.get(data);
};

/**
 * Whether two dashboard attachment data describe the same dashboard, ignoring what the dashboard
 * adds or drops when it serializes the state.
 */
export const isSameDashboardContent = (
  left: DashboardAttachmentData,
  right: DashboardAttachmentData
): boolean => isEqual(getComparableDashboardData(left), getComparableDashboardData(right));
