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

export const mapScheduledDetailsToQueryData = (
  data: ScheduledExecutionDetailsItem,
  scheduleId: string
) => [
  {
    action_id: scheduleId,
    id: data.queryName || scheduleId,
    query: data.queryText || '',
    agents: [] as string[],
    status: 'completed' as const,
    docs: data.totalRows,
    successful: data.successCount,
    failed: data.errorCount,
    pending: 0,
  },
];

interface ScheduledActionResultsResponse {
  metadata: {
    scheduleId: string;
    executionCount: number;
    packId: string;
    packName: string;
    queryName: string;
    queryText: string;
    timestamp: string;
  };
  aggregations: {
    totalRowCount: number;
    totalResponded: number;
    successful: number;
    failed: number;
    pending: number;
  };
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

  return useQuery<ScheduledActionResultsResponse, Error, ScheduledExecutionDetailsItem>(
    ['scheduledExecutionDetails', { scheduleId, executionCount }],
    () =>
      http.get<ScheduledActionResultsResponse>(
        `/api/osquery/scheduled_results/${scheduleId}/${executionCount}`,
        {
          version: API_VERSIONS.public.v1,
          query: { pageSize: 1 },
        }
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
      select: (response) => ({
        ...response.metadata,
        agentCount: response.aggregations.totalResponded,
        successCount: response.aggregations.successful,
        errorCount: response.aggregations.failed,
        totalRows: response.aggregations.totalRowCount,
      }),
      refetchOnWindowFocus: false,
    }
  );
};
