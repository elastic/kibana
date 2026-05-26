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
import { DEFAULT_EPISODES_LIST_FILTER } from './episodes_list_url_state';

export const toggleAlertsKpiFilter = (
  filterState: EpisodesFilterState,
  kpi: EpisodesAlertsKpiFilter
): EpisodesFilterState => {
  const isSelected = filterState.alertsKpi === kpi;

  if (isSelected) {
    const next = { ...filterState, alertsKpi: undefined, highSeverityOnly: undefined };
    if (kpi === 'total') {
      next.status = DEFAULT_EPISODES_LIST_FILTER.status;
    }
    if (kpi === 'active') {
      next.status = DEFAULT_EPISODES_LIST_FILTER.status;
    }
    return next;
  }

  const next: EpisodesFilterState = {
    ...filterState,
    alertsKpi: kpi,
    highSeverityOnly: undefined,
  };

  if (kpi === 'active') {
    next.status = 'active';
  } else if (kpi === 'high_severity') {
    next.highSeverityOnly = true;
    next.status = filterState.status ?? DEFAULT_EPISODES_LIST_FILTER.status;
  } else if (kpi === 'total') {
    next.status = undefined;
  }

  return next;
};

export const toggleActionKpiFilter = (
  filterState: EpisodesFilterState,
  kpi: EpisodesActionKpiFilter
): EpisodesFilterState => {
  const isSelected = filterState.actionKpi === kpi;

  if (isSelected) {
    return { ...filterState, actionKpi: undefined, assigneeUid: undefined };
  }

  return {
    ...filterState,
    actionKpi: kpi,
    assigneeUid: undefined,
  };
};

export const applyStatusFilterChange = (
  prev: EpisodesFilterState,
  status: string | undefined
): EpisodesFilterState => {
  const next: EpisodesFilterState = { ...prev, status };

  if (status === 'active' && !prev.highSeverityOnly) {
    return { ...next, alertsKpi: 'active', highSeverityOnly: undefined };
  }

  if (status === undefined) {
    return { ...next, alertsKpi: 'total', highSeverityOnly: undefined };
  }

  return { ...next, alertsKpi: undefined, highSeverityOnly: undefined };
};

export const applyAssigneeFilterChange = (
  prev: EpisodesFilterState,
  assigneeUid: string | undefined
): EpisodesFilterState => ({
  ...prev,
  assigneeUid,
  actionKpi: undefined,
});

export const isAlertsKpiSelected = (
  filterState: EpisodesFilterState,
  kpi: EpisodesAlertsKpiFilter
): boolean => {
  if (filterState.alertsKpi != null) {
    return filterState.alertsKpi === kpi;
  }

  if (kpi === 'active') {
    return (
      filterState.status === DEFAULT_EPISODES_LIST_FILTER.status && !filterState.highSeverityOnly
    );
  }

  return false;
};

export const isActionKpiSelected = (
  filterState: EpisodesFilterState,
  kpi: EpisodesActionKpiFilter
): boolean => filterState.actionKpi === kpi;
