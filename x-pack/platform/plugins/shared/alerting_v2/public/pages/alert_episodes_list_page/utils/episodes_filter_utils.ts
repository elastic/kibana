/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import deepEqual from 'fast-deep-equal';
import { DEFAULT_EPISODES_LIST_FILTER } from './episodes_list_url_state';
import { isAlertsKpiSelected } from './episodes_kpi_filter_utils';

/** Default list scope on first visit: Active alerts KPI with no extra filters. */
export const isDefaultActiveAlertsView = (filterState: EpisodesFilterState): boolean =>
  filterState.alertsKpi === DEFAULT_EPISODES_LIST_FILTER.alertsKpi &&
  filterState.status === DEFAULT_EPISODES_LIST_FILTER.status &&
  !filterState.highSeverityOnly &&
  !filterState.actionKpi &&
  !filterState.ruleId &&
  !filterState.tags?.length &&
  !filterState.assigneeUid &&
  !filterState.queryString;

/** Active alerts KPI is selected (default scope on first visit). */
export const isActiveAlertsScope = (filterState: EpisodesFilterState): boolean =>
  isAlertsKpiSelected(filterState, 'active');

/** Total KPI / all statuses — the "view all" pool used as the comparison total. */
export const isViewAllAlertsScope = (filterState: EpisodesFilterState): boolean =>
  filterState.alertsKpi === 'total' ||
  (filterState.status == null &&
    filterState.alertsKpi !== 'active' &&
    filterState.alertsKpi !== 'high_severity' &&
    !filterState.highSeverityOnly);

export const isHighSeverityAlertsScope = (filterState: EpisodesFilterState): boolean =>
  filterState.alertsKpi === 'high_severity' || Boolean(filterState.highSeverityOnly);

/** Search, rule, tags, assignee, or alert-action KPIs layered on top of the alerts scope. */
export const hasNarrowingEpisodesFilters = (filterState: EpisodesFilterState): boolean =>
  Boolean(
    filterState.ruleId ||
      filterState.tags?.length ||
      filterState.assigneeUid ||
      filterState.queryString ||
      filterState.actionKpi
  );

export const hasActiveEpisodesFilters = (filterState: EpisodesFilterState): boolean =>
  !deepEqual(filterState, DEFAULT_EPISODES_LIST_FILTER);

/** Reset is shown only for Active alerts; Total (view all) never shows reset. */
export const shouldShowToolbarReset = (filterState: EpisodesFilterState): boolean =>
  isActiveAlertsScope(filterState);

export type EpisodesToolbarStatusKind =
  | 'active_alerts'
  | 'view_all'
  | 'high_severity'
  | 'filtered';

export const getEpisodesToolbarStatusKind = (
  filterState: EpisodesFilterState
): EpisodesToolbarStatusKind => {
  if (isActiveAlertsScope(filterState)) {
    return 'active_alerts';
  }

  if (isViewAllAlertsScope(filterState)) {
    return 'view_all';
  }

  if (hasNarrowingEpisodesFilters(filterState)) {
    return 'filtered';
  }

  if (isHighSeverityAlertsScope(filterState)) {
    return 'high_severity';
  }

  return 'filtered';
};
