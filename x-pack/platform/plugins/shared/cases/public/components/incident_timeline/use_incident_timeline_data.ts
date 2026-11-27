/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { MAX_USER_ACTIONS_PER_PAGE } from '../../../common/constants';
import type { IncidentTimelineAlertsResponse } from '../../../common/types/api';
import { UserActionTypes } from '../../../common/types/domain';
import type { CaseStatuses } from '../../../common/types/domain';
import type { UserActionUI } from '../../../common/ui/types';
import { findCaseUserActions } from '../../containers/api';
import { casesQueriesKeys } from '../../containers/constants';
import type { ServerError } from '../../types';
import { getIncidentTimelineAlerts } from './api';
import type { StatusChange } from './model';

export const useIncidentTimelineAlerts = (caseId: string, isEnabled: boolean) =>
  useQuery<IncidentTimelineAlertsResponse, ServerError>(
    casesQueriesKeys.incidentTimelineAlerts(caseId),
    ({ signal }) => getIncidentTimelineAlerts(caseId, signal),
    { enabled: isEnabled }
  );

const toStatusChange = ({
  payload,
  createdAt,
  createdBy,
  source,
}: UserActionUI): StatusChange[] => {
  if (!('status' in payload)) return [];
  return [
    {
      status: payload.status as CaseStatuses,
      atMs: Date.parse(createdAt),
      user: createdBy.fullName || createdBy.username || '',
      source: source?.name ? `${source.type} (${source.name})` : source?.type,
    },
  ];
};

const fetchAllStatusChanges = async (
  caseId: string,
  signal?: AbortSignal
): Promise<StatusChange[]> => {
  const changes: StatusChange[] = [];
  for (let page = 1; ; page++) {
    const { userActions, total } = await findCaseUserActions(
      caseId,
      { type: UserActionTypes.status, sortOrder: 'asc', page, perPage: MAX_USER_ACTIONS_PER_PAGE },
      signal
    );
    changes.push(...userActions.flatMap(toStatusChange));
    if (userActions.length === 0 || page * MAX_USER_ACTIONS_PER_PAGE >= total) return changes;
  }
};

export const useCaseStatusChanges = (caseId: string) =>
  useQuery<StatusChange[], ServerError>(
    casesQueriesKeys.incidentTimelineStatusChanges(caseId),
    ({ signal }) => fetchAllStatusChanges(caseId, signal)
  );
