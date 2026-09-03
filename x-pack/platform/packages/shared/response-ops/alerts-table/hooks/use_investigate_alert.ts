/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context } from 'react';
import { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { QueryClient } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';

interface InvestigationListResponse {
  results: Array<{ status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' }>;
}

const getStatusQuery = (alertId: string) => ({
  concurrency_key: alertId,
  sort_field: 'created_at',
  sort_order: 'desc',
  size: 1,
});

export const useInvestigateAlert = ({
  alertId,
  application,
  http,
  notifications,
  startInvestigation,
  enabled = true,
  onInvestigate,
  queryContext,
}: {
  alertId?: string;
  application: ApplicationStart;
  http: HttpStart;
  notifications: NotificationsStart;
  startInvestigation: () => Promise<unknown>;
  enabled?: boolean;
  onInvestigate?: () => void;
  queryContext?: Context<QueryClient | undefined>;
}) => {
  const statusQueryKey = ['alertInvestigations', http.basePath.get?.() ?? '', alertId] as const;
  const queryClient = useQueryClient({ context: queryContext });
  const canInvestigate = Boolean(
    enabled && alertId && application.capabilities?.agentBuilder?.write === true
  );
  const { data: availability } = useQuery({
    queryKey: ['investigationAvailability', http.basePath.get?.() ?? ''],
    queryFn: ({ signal }) =>
      http.get<{ available: boolean }>('/internal/nightshift/investigations/availability', {
        signal,
      }),
    context: queryContext,
    enabled: canInvestigate,
    retry: false,
    staleTime: 30_000,
  });
  const { data: investigations } = useQuery({
    queryKey: statusQueryKey,
    queryFn: ({ signal }) =>
      http.get<InvestigationListResponse>('/internal/nightshift/investigations', {
        query: getStatusQuery(alertId ?? ''),
        signal,
      }),
    context: queryContext,
    enabled: canInvestigate && availability?.available === true,
    retry: false,
    refetchInterval: (data) =>
      data?.results[0]?.status === 'pending' || data?.results[0]?.status === 'running'
        ? 5_000
        : false,
  });
  const [isStarting, setIsStarting] = useState(false);
  const latestStatus = investigations?.results[0]?.status;
  const hasOngoingInvestigation = latestStatus === 'pending' || latestStatus === 'running';
  const isInvestigating = isStarting || hasOngoingInvestigation;
  const showInvestigateAction = Boolean(
    canInvestigate && availability?.available === true && investigations
  );
  const investigateActionLabel = isInvestigating
    ? i18n.translate('xpack.responseOpsAlertsTable.investigating', {
        defaultMessage: 'Investigating',
      })
    : latestStatus === 'completed'
    ? i18n.translate('xpack.responseOpsAlertsTable.reinvestigate', {
        defaultMessage: 'Re-investigate',
      })
    : i18n.translate('xpack.responseOpsAlertsTable.investigate', {
        defaultMessage: 'Investigate',
      });

  const handleInvestigate = async () => {
    if (!alertId || isInvestigating) return;

    setIsStarting(true);
    onInvestigate?.();
    try {
      await startInvestigation();
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.responseOpsAlertsTable.investigationStarted', {
          defaultMessage: 'Investigation started',
        }),
      });
      queryClient.setQueryData<InvestigationListResponse>(statusQueryKey, {
        results: [{ status: 'pending' }],
      });
    } catch (error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.responseOpsAlertsTable.investigationFailed', {
          defaultMessage: 'Failed to start investigation',
        }),
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsStarting(false);
    }
  };

  return { showInvestigateAction, handleInvestigate, isInvestigating, investigateActionLabel };
};
