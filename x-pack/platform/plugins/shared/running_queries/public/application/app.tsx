/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CANCELLATION_POLL_INTERVAL_MS, PLUGIN_NAME } from '../../common/constants';
import {
  getStopRequestedTaskIds,
  pruneStopRequestedTasks,
} from '../lib/stop_requested_tasks_storage';
import { useBreadcrumbs } from './hooks/use_breadcrumbs';
import { useRunningQueriesAppContext } from './app_context';
import { RunningQueriesTable } from './components/running_queries_table';
import { RunningQueriesNoAccessPrompt } from './no_access_prompt';

const RunningQueriesAppWithData: React.FC = () => {
  const { apiService, notifications } = useRunningQueriesAppContext();
  const { data, isLoading, error, resendRequest } = apiService.useLoadRunningQueries();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  // Tracks task IDs for which a cancel request has been sent but the task hasn't
  // disappeared from the API yet. Initialized from localStorage so that if the user
  // navigates away and back mid-cancellation, polling resumes automatically.
  const [pendingCancellations, setPendingCancellations] = useState<Set<string>>(() =>
    getStopRequestedTaskIds()
  );
  // Ref kept in sync with state so the polling interval can always read the current
  // set without it being a stale closure value.
  const pendingCancellationsRef = useRef(pendingCancellations);
  pendingCancellationsRef.current = pendingCancellations;

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefreshTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefreshTime]);

  // While there are pending cancellations, silently poll the search API every 5s to
  // check whether those tasks have disappeared (i.e. the cancellation completed).
  // We intentionally do NOT call resendRequest() on every tick — that would update
  // the visible query list on each poll. We only update the visible list once we
  // confirm that at least one pending task is gone, which is the meaningful moment
  // to refresh.
  useEffect(() => {
    if (pendingCancellations.size === 0) return;

    const intervalId = setInterval(async () => {
      const { data: pollData } = await apiService.fetchRunningQueries();
      const currentTaskIds = new Set((pollData?.queries ?? []).map((q) => q.taskId));
      const current = pendingCancellationsRef.current;
      // Determine which of the tracked cancellations are still present in the task list.
      const stillPending = new Set([...current].filter((id) => currentTaskIds.has(id)));

      if (stillPending.size !== current.size) {
        // At least one cancelled task has disappeared. Clean up localStorage (which
        // removes the "Stopping the query…" label on re-render), shrink the pending
        // set (which stops polling once empty), and refresh the visible list.
        pruneStopRequestedTasks({ validTaskIds: currentTaskIds });
        setPendingCancellations(stillPending);
        resendRequest();
        setLastRefreshTime(Date.now());
      }
    }, CANCELLATION_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [pendingCancellations.size, apiService, resendRequest]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    resendRequest();
    setIsRefreshing(false);
    setLastRefreshTime(Date.now());
  }, [resendRequest]);

  const handleCancelQuery = useCallback(
    async (taskId: string): Promise<boolean> => {
      try {
        const { error: cancelError } = await apiService.cancelTask(taskId);

        if (cancelError) {
          notifications.toasts.addDanger(
            i18n.translate('xpack.runningQueries.stopQueryErrorToast', {
              defaultMessage: 'Failed to stop query {taskId}',
              values: { taskId },
            })
          );
          return false;
        }

        notifications.toasts.addSuccess(
          i18n.translate('xpack.runningQueries.stopQueryToast', {
            defaultMessage: 'Stop requested for query {taskId}',
            values: { taskId },
          })
        );

        setPendingCancellations((prev) => new Set([...prev, taskId]));
        resendRequest();
        setLastRefreshTime(Date.now());
        return true;
      } catch {
        notifications.toasts.addDanger(
          i18n.translate('xpack.runningQueries.stopQueryErrorToast', {
            defaultMessage: 'Failed to stop query {taskId}',
            values: { taskId },
          })
        );
        return false;
      }
    },
    [apiService, notifications, resendRequest]
  );

  const queries = data?.queries ?? [];

  return (
    <EuiPageTemplate restrictWidth={false}>
      <EuiPageTemplate.Header
        pageTitle={PLUGIN_NAME}
        description={
          <FormattedMessage
            id="xpack.runningQueries.subtitle"
            defaultMessage="Real-time insights and control over query performance within your cluster. {learnMore}"
            values={{
              learnMore: (
                <EuiLink href="https://elastic.co" target="_blank" external>
                  <FormattedMessage
                    id="xpack.runningQueries.subtitle.learnMoreLink"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        rightSideItems={[
          <EuiFlexGroup key="refresh-group" alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {secondsAgo < 60
                  ? i18n.translate('xpack.runningQueries.lastUpdatedLessThanOneMinute', {
                      defaultMessage: 'Updated <1m ago',
                    })
                  : i18n.translate('xpack.runningQueries.lastUpdatedMinutes', {
                      defaultMessage: 'Updated {minutes}min ago',
                      values: { minutes: Math.floor(secondsAgo / 60) },
                    })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton iconType="refresh" isLoading={isRefreshing} onClick={handleRefresh}>
                {i18n.translate('xpack.runningQueries.refreshButton', {
                  defaultMessage: 'Refresh',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ]}
      />
      <EuiPageTemplate.Section>
        <RunningQueriesTable
          queries={queries}
          onCancelQuery={handleCancelQuery}
          isLoading={isLoading}
          error={
            error
              ? i18n.translate('xpack.runningQueries.loadError', {
                  defaultMessage: 'Failed to load running queries.',
                })
              : undefined
          }
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export const RunningQueriesApp: React.FC = () => {
  useBreadcrumbs();

  const { capabilities } = useRunningQueriesAppContext();

  if (capabilities.isLoading) {
    return (
      <EuiPageTemplate restrictWidth={false}>
        <EuiPageTemplate.Header pageTitle={PLUGIN_NAME} />
        <EuiPageTemplate.Section>
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    );
  }

  if (!capabilities.canViewTasks) {
    return (
      <RunningQueriesNoAccessPrompt
        missingClusterPrivileges={capabilities.missingClusterPrivileges}
      />
    );
  }

  return <RunningQueriesAppWithData />;
};
