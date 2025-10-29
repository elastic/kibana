/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { ServerError } from '../../../types';
import type { ActionConnector } from '../../../../common/types/domain';
import { connectorsQueriesKeys } from '../constants';
import { getIssueTypes } from './api';
import type { IssueTypes } from './types';
import * as i18n from './translations';

interface Props {
  http: HttpSetup;
  connector?: ActionConnector;
}

export const useGetIssueTypes = ({ http, connector }: Props) => {
  const { showErrorToast } = useCasesToast();
  return useQuery<ActionTypeExecutorResult<IssueTypes>, ServerError>(
    connectorsQueriesKeys.jiraGetIssueTypes(connector?.id ?? ''),
    ({ signal }) => {
      return getIssueTypes({
        http,
        signal,
        connectorId: connector?.id ?? '',
      });
    },
    {
      enabled: Boolean(connector),
      staleTime: 60 * 1000, // one minute
      onSuccess: (res) => {
        if (res.status && res.status === 'error') {
          showErrorToast(new Error(i18n.ISSUE_TYPES_API_ERROR), {
            title: i18n.ISSUE_TYPES_API_ERROR,
            toastMessage: `${res.serviceMessage ?? res.message}`,
          });
        }
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ISSUE_TYPES_API_ERROR });
      },
    }
  );
};

export type UseGetIssueTypes = ReturnType<typeof useGetIssueTypes>;
