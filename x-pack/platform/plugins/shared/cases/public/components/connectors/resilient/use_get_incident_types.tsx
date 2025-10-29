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
import { getIncidentTypes } from './api';
import * as i18n from './translations';

type IncidentTypes = Array<{ id: number; name: string }>;

interface Props {
  http: HttpSetup;
  connector?: ActionConnector;
}

export const useGetIncidentTypes = ({ http, connector }: Props) => {
  const { showErrorToast } = useCasesToast();
  return useQuery<ActionTypeExecutorResult<IncidentTypes>, ServerError>(
    connectorsQueriesKeys.resilientGetIncidentTypes(connector?.id ?? ''),
    ({ signal }) => {
      return getIncidentTypes({
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
          showErrorToast(new Error(i18n.INCIDENT_TYPES_API_ERROR), {
            title: i18n.INCIDENT_TYPES_API_ERROR,
            toastMessage: `${res.serviceMessage ?? res.message}`,
          });
        }
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.INCIDENT_TYPES_API_ERROR });
      },
    }
  );
};

export type UseGetIncidentTypes = ReturnType<typeof useGetIncidentTypes>;
