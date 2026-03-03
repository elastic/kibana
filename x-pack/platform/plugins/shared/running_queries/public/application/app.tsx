/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import { PLUGIN_NAME } from '../../common/constants';
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

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefreshTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefreshTime]);

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
        {isLoading && !data ? (
          <EuiLoadingSpinner size="l" />
        ) : error ? (
          <EuiText color="danger">
            <p>
              {i18n.translate('xpack.runningQueries.loadError', {
                defaultMessage: 'Failed to load running queries.',
              })}
            </p>
          </EuiText>
        ) : (
          <RunningQueriesTable queries={queries} onCancelQuery={handleCancelQuery} />
        )}
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
          <EuiLoadingSpinner size="l" />
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
