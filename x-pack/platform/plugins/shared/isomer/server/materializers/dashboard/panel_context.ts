/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { toStoredQuery } from '@kbn/as-code-shared-transforms';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { MaterializeContext } from '../../../common';
import { resolveTimeRange } from '../../materialize/time_range';
import type { MaterializeContextOverride } from '../../materialize/types';
import type { DashboardConfig } from './config';
import type { DashboardControl } from './controls';
import { controlEsqlVariables, controlTimeslice } from './controls';

/** The context every panel starts from: the request's, then the dashboard's own state and controls. */
export interface DashboardContext {
  /** Set when the request has no query, so the dashboard's saved query applies. */
  query?: Query;
  /** The dashboard's absolute time range: the request's, else the saved one, else Kibana's default. */
  timeRange?: TimeRange;
  /** The time slider's range, which replaces the time range for panels without their own. */
  timeslice?: TimeRange;
  /** Control filters with their scope, then the dashboard's saved filters. */
  controlFilters: Filter[];
  savedFilters: Filter[];
  /** Control variables, with the request's in place of any of the same name. */
  esqlVariables?: ESQLControlVariable[];
}

/** Resolves a dashboard's context once, before its panels are planned. */
export const dashboardContext = (
  { state, resolved }: DashboardConfig,
  controls: DashboardControl[],
  context: MaterializeContext,
  now: Date
): DashboardContext => {
  const range = context.timeRange ?? state.time_range ?? resolved?.timeDefaults;
  // Resolved as the pipeline resolves the request's: in the context's time zone, then the user's
  // `dateFormat:tz`, as Kibana's browser does.
  const timeRange = range
    ? resolveTimeRange(range, {
        now,
        timeZone: context.timeZone ?? resolved?.timeZone ?? 'Browser',
      })
    : undefined;
  const controlVariables = controlEsqlVariables(controls);
  const requestVariables = context.esqlVariables ?? [];
  const requestKeys = new Set(requestVariables.map(({ key }) => key));
  const esqlVariables = [
    ...controlVariables.filter(({ key }) => !requestKeys.has(key)),
    ...requestVariables,
  ];
  return {
    ...(!context.query && state.query ? { query: toStoredQuery(state.query) } : {}),
    ...(timeRange ? { timeRange } : {}),
    ...(timeRange ? { timeslice: controlTimeslice(controls, timeRange) } : {}),
    controlFilters: (resolved?.controlFilters ?? []).map(({ filter }) => filter),
    savedFilters: toStoredFilters(state.filters) ?? [],
    ...(esqlVariables.length > 0 ? { esqlVariables } : {}),
  };
};

/**
 * Whether something a control published applies to a panel, as Kibana's panel fetch context decides:
 * not the control's own panel, and only panels in its section when it's in one.
 */
const appliesTo = (
  meta: { controlledBy?: unknown; group?: unknown } | undefined,
  panelId: string | undefined,
  sectionId: string | undefined
): boolean =>
  (panelId === undefined || meta?.controlledBy !== panelId) &&
  (meta?.group ? meta.group === sectionId : true);

/** A panel's own time range, when it has a custom one. */
export const customTimeRange = (config: Record<string, unknown>): TimeRange | undefined => {
  const { time_range: timeRange } = config;
  if (typeof timeRange !== 'object' || timeRange === null) {
    return undefined;
  }
  const { from, to } = timeRange as Partial<TimeRange>;
  return typeof from === 'string' && typeof to === 'string' ? { from, to } : undefined;
};

/**
 * The context one panel materializes in, on top of the request's: the dashboard's filters, query
 * and ES|QL variables that apply to it, and the panel's custom time range, else the time slider's,
 * else the dashboard's, as Lens resolves them.
 */
export const panelContext = (
  dashboard: DashboardContext,
  panel: { id?: string; sectionId?: string; config: Record<string, unknown> }
): MaterializeContextOverride => {
  const { id, sectionId, config } = panel;
  const filters = [
    ...dashboard.controlFilters.filter(({ meta }) => appliesTo(meta, id, sectionId)),
    ...dashboard.savedFilters,
  ];
  const esqlVariables = dashboard.esqlVariables?.filter(({ meta }) =>
    appliesTo(meta, id, sectionId)
  );
  const timeRange = customTimeRange(config) ?? dashboard.timeslice ?? dashboard.timeRange;
  return {
    ...(filters.length > 0 ? { filters } : {}),
    ...(dashboard.query ? { query: dashboard.query } : {}),
    ...(timeRange ? { timeRange } : {}),
    ...(esqlVariables ? { esqlVariables } : {}),
  };
};
