/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import type { QueryOptionsOverrides } from '@kbn/alerts-ui-shared/src/common/types/tanstack_query_utility_types';
import type { ServerError } from '@kbn/response-ops-alerts-apis/types';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { queryKeys } from '../constants';
import type { Case, CasesBulkGetResponse } from '../apis/bulk_get_cases';
import { bulkGetCases } from '../apis/bulk_get_cases';

const ERROR_TITLE = i18n.translate('xpack.triggersActionsUI.cases.api.bulkGet', {
  defaultMessage: 'Error fetching cases data',
});

const transformCases = (data: CasesBulkGetResponse): Map<string, Case> => {
  const casesMap = new Map();
  for (const theCase of data?.cases ?? []) {
    casesMap.set(theCase.id, { ...theCase });
  }
  return casesMap;
};

export interface UseBulkGetCasesQueryParams {
  caseIds: string[];
  http: HttpStart;
  notifications: NotificationsStart;
}

export const useBulkGetCasesQuery = (
  { caseIds, http, notifications: { toasts } }: UseBulkGetCasesQueryParams,
  options?: Pick<QueryOptionsOverrides<typeof bulkGetCases>, 'enabled'>
) => {
  return useQuery({
    queryKey: queryKeys.casesBulkGet(caseIds),
    queryFn: ({ signal }) => bulkGetCases(http, { ids: caseIds }, signal),
    context: AlertsQueryContext,
    enabled: caseIds.length > 0 && options?.enabled !== false,
    select: transformCases,
    onError: (error: ServerError) => {
      if (error.name !== 'AbortError') {
        toasts.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
          title: ERROR_TITLE,
        });
      }
    },
  });
};
