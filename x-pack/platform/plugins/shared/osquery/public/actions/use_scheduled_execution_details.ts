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

export interface ScheduledExecutionDetailsItem {
  scheduleId: string;
  executionCount: number;
  packId: string;
  packName: string;
  queryName: string;
  queryText: string;
  timestamp: string;
  agentCount: number;
  successCount: number;
  errorCount: number;
  totalRows: number;
}

interface UseScheduledExecutionDetails {
  scheduleId: string;
  executionCount: number;
  skip?: boolean;
}

export const useScheduledExecutionDetails = ({
  scheduleId,
  executionCount,
  skip = false,
}: UseScheduledExecutionDetails) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<{ data: ScheduledExecutionDetailsItem }, Error, ScheduledExecutionDetailsItem>(
    ['scheduledExecutionDetails', { scheduleId, executionCount }],
    () =>
      http.get<{ data: ScheduledExecutionDetailsItem }>(
        `/internal/osquery/history/scheduled/${scheduleId}/${executionCount}`,
        { version: API_VERSIONS.internal.v1 }
      ),
    {
      enabled: !skip && !!scheduleId,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.scheduled_execution_details.fetchError', {
            defaultMessage: 'Error while fetching scheduled execution details',
          }),
        }),
      select: (response) => response.data,
      refetchOnWindowFocus: false,
    }
  );
};
