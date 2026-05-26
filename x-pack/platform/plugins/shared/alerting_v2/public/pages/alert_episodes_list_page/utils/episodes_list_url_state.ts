/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EpisodesActionKpiFilter,
  EpisodesAlertsKpiFilter,
  EpisodesFilterState,
} from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { TimeRange } from '@kbn/es-query';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { isArray, isNil, isPlainObject, isString } from 'lodash';

/** Namespace for episodes list state inside the `_a` app-state blob */
export const EPISODES_LIST_APP_STATE_KEY = 'episodesList' as const;

/** Serialized in `_a` so “all statuses” survives reload (distinct from default Active) */
export const EPISODES_LIST_STATUS_URL_ALL = 'all' as const;

/** Default list filters (Active episodes KPI, no rule/tags/search/assignee). */
export const DEFAULT_EPISODES_LIST_FILTER: EpisodesFilterState = {
  status: 'active',
  alertsKpi: 'active',
};

/** Matches {@link useEpisodesTimeRange} fallback when timefilter has no prior state */
export const DEFAULT_EPISODES_LIST_TIME_RANGE: TimeRange = {
  from: 'now-24h',
  to: 'now',
};

type AppStateRecord = Record<string, unknown> & {
  [EPISODES_LIST_APP_STATE_KEY]?: unknown;
};

const isNonEmptyString = (v: unknown): v is string => isString(v) && v.trim().length > 0;

const isStringArray = (v: unknown): v is string[] =>
  isArray(v) && v.length > 0 && v.every(isString);

function decodeFilterFields(o: Record<string, unknown>): EpisodesFilterState {
  const result: EpisodesFilterState = {};
  if (o.status === EPISODES_LIST_STATUS_URL_ALL) {
    result.status = undefined;
  } else if (isNonEmptyString(o.status)) {
    result.status = o.status;
  }
  if (isNonEmptyString(o.ruleId)) {
    result.ruleId = o.ruleId;
  }
  if (isNonEmptyString(o.queryString)) {
    result.queryString = o.queryString.trim();
  }
  if (isStringArray(o.tags)) {
    result.tags = [...o.tags];
  }
  if (isNonEmptyString(o.assigneeUid)) {
    result.assigneeUid = o.assigneeUid;
  }
  if (isNonEmptyString(o.alertsKpi)) {
    result.alertsKpi = o.alertsKpi as EpisodesAlertsKpiFilter;
  }
  if (isNonEmptyString(o.actionKpi)) {
    result.actionKpi = o.actionKpi as EpisodesActionKpiFilter;
  }
  if (o.highSeverityOnly === true) {
    result.highSeverityOnly = true;
  }
  return result;
}

function splitEpisodesListRaw(raw: unknown): {
  filter: EpisodesFilterState;
  timeRange?: TimeRange;
  hasExplicitStatus: boolean;
} {
  if (!isPlainObject(raw)) {
    return { filter: {}, hasExplicitStatus: false };
  }
  const o = raw as Record<string, unknown>;
  const { timeFrom, timeTo, ...rest } = o;
  const filter = decodeFilterFields(rest);
  const hasExplicitStatus = 'status' in rest;
  if (isNonEmptyString(timeFrom) && isNonEmptyString(timeTo)) {
    return { filter, hasExplicitStatus, timeRange: { from: timeFrom, to: timeTo } };
  }
  return { filter, hasExplicitStatus };
}

function encodeFilterFields(state: EpisodesFilterState): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const st = state.status;
  if (isNil(st)) {
    result.status = EPISODES_LIST_STATUS_URL_ALL;
  } else if (isNonEmptyString(st) && st !== DEFAULT_EPISODES_LIST_FILTER.status) {
    result.status = st;
  }
  if (isNonEmptyString(state.ruleId)) {
    result.ruleId = state.ruleId;
  }
  if (isNonEmptyString(state.queryString)) {
    result.queryString = state.queryString.trim();
  }
  if (isStringArray(state.tags)) {
    result.tags = [...state.tags];
  }
  if (isNonEmptyString(state.assigneeUid)) {
    result.assigneeUid = state.assigneeUid;
  }
  if (state.alertsKpi && state.alertsKpi !== DEFAULT_EPISODES_LIST_FILTER.alertsKpi) {
    result.alertsKpi = state.alertsKpi;
  }
  if (state.actionKpi) {
    result.actionKpi = state.actionKpi;
  }
  if (state.highSeverityOnly) {
    result.highSeverityOnly = true;
  }
  return result;
}

function encodeEpisodesListRecord(
  filter: EpisodesFilterState,
  timeRange: TimeRange
): Record<string, unknown> {
  const out = encodeFilterFields(filter);
  if (
    timeRange.from !== DEFAULT_EPISODES_LIST_TIME_RANGE.from ||
    timeRange.to !== DEFAULT_EPISODES_LIST_TIME_RANGE.to
  ) {
    out.timeFrom = timeRange.from;
    out.timeTo = timeRange.to;
  }
  return out;
}

export function readEpisodesListAppStateFromUrlStorage(storage: IKbnUrlStateStorage): {
  filterState: EpisodesFilterState;
  timeRange?: TimeRange;
} {
  const raw = storage.get<AppStateRecord>('_a')?.[EPISODES_LIST_APP_STATE_KEY];
  const { filter, timeRange, hasExplicitStatus } = splitEpisodesListRaw(raw);
  const filterState: EpisodesFilterState = { ...DEFAULT_EPISODES_LIST_FILTER, ...filter };

  if (!hasExplicitStatus && filter.alertsKpi != null) {
    if (filter.alertsKpi === 'total') {
      filterState.status = undefined;
    } else if (filter.alertsKpi === 'active') {
      filterState.status = 'active';
    } else if (filter.alertsKpi === 'high_severity') {
      filterState.highSeverityOnly = true;
    }
  }

  return {
    filterState,
    ...(timeRange ? { timeRange } : {}),
  };
}

export async function writeEpisodesListAppStateToUrlStorage(
  storage: IKbnUrlStateStorage,
  filter: EpisodesFilterState,
  timeRange: TimeRange
): Promise<void> {
  const serialized = encodeEpisodesListRecord(filter, timeRange);
  const appState = storage.get<AppStateRecord>('_a') ?? {};
  const {
    [EPISODES_LIST_APP_STATE_KEY]: _ignoredEpisodesListState,
    ...appStateWithoutEpisodesList
  } = appState;

  const nextAppState: AppStateRecord =
    Object.keys(serialized).length === 0
      ? appStateWithoutEpisodesList
      : { ...appStateWithoutEpisodesList, [EPISODES_LIST_APP_STATE_KEY]: serialized };

  await storage.set('_a', nextAppState, { replace: false });
}
