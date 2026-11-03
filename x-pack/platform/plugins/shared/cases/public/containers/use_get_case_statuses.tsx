/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { CaseStatusDefinition } from '../../common/types/domain';
import { DEFAULT_CASE_STATUSES } from '../../common/utils/statuses';
import { isCustomStatusesEnabled } from '../common/custom_statuses';
import { useCasesToast } from '../common/use_cases_toast';
import type { ServerError } from '../types';
import { getCaseStatuses } from './api';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

const DEFAULT_STATUSES: CaseStatusDefinition[] = [...DEFAULT_CASE_STATUSES];

/**
 * The statuses of the current space, in admin order. Without custom statuses it returns the
 * default statuses and does not call the server.
 */
export const useGetCaseStatuses = () => {
  const { showErrorToast } = useCasesToast();
  const enabled = isCustomStatusesEnabled();

  const query = useQuery(
    casesQueriesKeys.caseStatusDefinitions(),
    ({ signal }) => getCaseStatuses({ signal }),
    {
      enabled,
      staleTime: 60 * 1000, // one minute
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_FETCHING_STATUSES });
      },
    }
  );

  return {
    ...query,
    data: enabled && query.data != null ? query.data : DEFAULT_STATUSES,
    isLoading: enabled && query.isLoading,
  };
};

export type UseGetCaseStatuses = ReturnType<typeof useGetCaseStatuses>;
