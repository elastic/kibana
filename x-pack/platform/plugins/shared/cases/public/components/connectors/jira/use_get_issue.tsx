/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { useQuery } from '@tanstack/react-query';
import { isEmpty } from 'lodash';
import type { ActionConnector } from '../../../../common/types/domain';
import { getIssue } from './api';
import type { Issue } from './types';
import * as i18n from './translations';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { ServerError } from '../../../types';
import { connectorsQueriesKeys } from '../constants';

interface Props {
  http: HttpSetup;
  id: string;
  actionConnector?: ActionConnector;
}

export const useGetIssue = ({ http, actionConnector, id }: Props) => {
  const { showErrorToast } = useCasesToast();
  return useQuery<ActionTypeExecutorResult<Issue>, ServerError>(
    connectorsQueriesKeys.jiraGetIssue(actionConnector?.id ?? '', id),
    ({ signal }) => {
      return getIssue({
        http,
        signal,
        connectorId: actionConnector?.id ?? '',
        id,
      });
    },
    {
      enabled: Boolean(actionConnector && !isEmpty(id)),
      staleTime: 60 * 1000, // one minute
      onSuccess: (res) => {
        if (res.status && res.status === 'error') {
          showErrorToast(new Error(i18n.GET_ISSUE_API_ERROR(id)), {
            title: i18n.GET_ISSUE_API_ERROR(id),
            toastMessage: `${res.serviceMessage ?? res.message}`,
          });
        }
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.GET_ISSUE_API_ERROR(id) });
      },
    }
  );
};

export type UseGetIssueTypes = ReturnType<typeof useGetIssue>;
