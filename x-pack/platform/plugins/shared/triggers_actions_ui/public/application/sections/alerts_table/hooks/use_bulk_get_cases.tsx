/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { QueryOptionsOverrides } from '@kbn/alerts-ui-shared/src/common/types/tanstack_query_utility_types';
import { useKibana } from '../../../../common';
import { triggersActionsUiQueriesKeys } from '../../../hooks/constants';
import { ServerError } from '../types';
import { bulkGetCases, Case, CasesBulkGetResponse } from './apis/bulk_get_cases';

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
}

export const useBulkGetCasesQuery = (
  { caseIds }: UseBulkGetCasesQueryParams,
  options?: Pick<QueryOptionsOverrides<typeof bulkGetCases>, 'enabled'>
) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery({
    queryKey: triggersActionsUiQueriesKeys.casesBulkGet(caseIds),
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
