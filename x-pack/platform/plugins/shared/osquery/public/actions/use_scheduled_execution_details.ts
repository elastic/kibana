/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';

import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';

export interface ScheduledExecutionDetails {
  scheduleId: string;
  executionCount: number;
  packName?: string;
  queryText: string;
  timestamp?: string;
  agentCount: number;
  successCount: number;
  errorCount: number;
  totalRows: number;
  responses: unknown[];
  results: unknown[];
}

interface UseScheduledExecutionDetailsConfig {
  scheduleId: string;
  executionCount: number;
  skip?: boolean;
}

export const useScheduledExecutionDetails = ({
  scheduleId,
  executionCount,
  skip = false,
}: UseScheduledExecutionDetailsConfig) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<ScheduledExecutionDetails, Error>(
    ['scheduledExecutionDetails', { scheduleId, executionCount }],
    () =>
      http.get<ScheduledExecutionDetails>(
        `/internal/osquery/history/scheduled/${scheduleId}/${executionCount}`,
        {
          version: API_VERSIONS.internal.v1,
        }
      ),
    {
      enabled: !skip && !!scheduleId,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.scheduled_execution_details.fetchError', {
            defaultMessage: 'Error while fetching scheduled execution details',
          }),
        }),
      refetchOnWindowFocus: false,
    }
  );
};
