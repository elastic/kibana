/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBadge,
  EuiSkeletonText,
  formatDate,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useScheduledExecutionDetails } from '../../../actions/use_scheduled_execution_details';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { PackQueriesStatusTable } from '../../../live_queries/form/pack_queries_status_table';

const tableWrapperCss = {
  paddingLeft: '10px',
};

const ScheduledExecutionDetailsPageComponent = () => {
  const { scheduleId, executionCount } = useParams<{
    scheduleId: string;
    executionCount: string;
  }>();
  const executionCountNum = Number(executionCount);
  useBreadcrumbs('history_details', { liveQueryId: scheduleId });
  const historyListProps = useRouterNavigate('history');

  const { data, isLoading } = useScheduledExecutionDetails({
    scheduleId,
    executionCount: executionCountNum,
  });

  // Map scheduled execution data to PackQueryStatusItem[] format
  const packQueriesData = useMemo(() => {
    if (!data) return undefined;

    return [
      {
        action_id: scheduleId,
        id: data.queryText ? 'query' : scheduleId,
        query: data.queryText ?? '',
        agents: [],
        status: 'completed',
        docs: data.totalRows ?? 0,
        pending: 0,
        successful: data.successCount ?? 0,
        failed: data.errorCount ?? 0,
      },
    ];
  }, [data, scheduleId]);

  const executionCountValues = useMemo(() => ({ count: executionCount }), [executionCount]);

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...historyListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.scheduledExecutionDetails.viewHistoryTitle"
              defaultMessage="View history"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.scheduledExecutionDetails.pageTitle"
                defaultMessage="Scheduled execution details"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [historyListProps]
  );

  if (isLoading) {
    return (
      <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
        <EuiSkeletonText lines={10} />
      </WithHeaderLayout>
    );
  }

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="l" alignItems="center">
            {data?.packName && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" iconType="package">
                  {data.packName}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {data?.timestamp && (
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {formatDate(data.timestamp)}
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.osquery.scheduledExecutionDetails.executionCountLabel"
                  defaultMessage="Execution #{count}"
                  values={executionCountValues}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem css={tableWrapperCss}>
          <PackQueriesStatusTable
            actionId={scheduleId}
            data={packQueriesData}
            scheduleId={scheduleId}
            executionCount={executionCountNum}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </WithHeaderLayout>
  );
};

export const ScheduledExecutionDetailsPage = React.memo(ScheduledExecutionDetailsPageComponent);
ScheduledExecutionDetailsPage.displayName = 'ScheduledExecutionDetailsPage';
