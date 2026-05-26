/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodesFilterState } from '../queries/episodes_query';

/**
 * Maps KPI and UI filter state into the shape consumed by {@link buildEpisodesQuery}.
 * Resolves "assigned to me" using the current user profile UID when available.
 */
export const resolveEpisodesFilterState = (
  filterState: EpisodesFilterState | undefined,
  currentUserProfileUid?: string
): EpisodesFilterState | undefined => {
  if (!filterState) {
    return undefined;
  }

  const { alertsKpi, actionKpi, highSeverityOnly, ...rest } = filterState;

  let status = rest.status;
  let severityOnly = highSeverityOnly;

  if (alertsKpi === 'active' && (status == null || status === 'active')) {
    status = 'active';
    severityOnly = undefined;
  } else if (alertsKpi === 'high_severity') {
    severityOnly = true;
  } else if (alertsKpi === 'total' && status == null) {
    status = undefined;
    severityOnly = undefined;
  }

  let assigneeUid = rest.assigneeUid;
  let actionKpiFilter = actionKpi;

  if (rest.assigneeUid) {
    assigneeUid = rest.assigneeUid;
    if (actionKpi !== 'assigned_to_me') {
      actionKpiFilter = undefined;
    }
  } else if (actionKpi === 'assigned_to_me') {
    assigneeUid = currentUserProfileUid;
    actionKpiFilter = undefined;
  } else if (actionKpi === 'unassigned' || actionKpi === 'acknowledged' || actionKpi === 'snoozed') {
    assigneeUid = undefined;
  }

  return {
    ...rest,
    status,
    assigneeUid,
    actionKpi: actionKpiFilter,
    highSeverityOnly: severityOnly,
  };
};
