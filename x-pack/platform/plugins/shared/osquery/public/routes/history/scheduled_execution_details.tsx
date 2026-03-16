/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useParams, Redirect } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiBadge,
  EuiSpacer,
  EuiSkeletonText,
  EuiLink,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment-timezone';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';
import { useRouterNavigate } from '../../common/lib/kibana';
import { pagePathGetters } from '../../common/page_paths';
import { WithHeaderLayout } from '../../components/layouts';
import {
  useScheduledExecutionDetails,
  mapScheduledDetailsToQueryData,
} from '../../actions/use_scheduled_execution_details';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';

const tableWrapperCss = {
  paddingLeft: '10px',
};

const ScheduledExecutionDetailsPageComponent = () => {
  const { scheduleId, executionCount: executionCountStr } = useParams<{
    scheduleId: string;
    executionCount: string;
  }>();

  const executionCount = parseInt(executionCountStr, 10);
  const isValid = !!scheduleId && !isNaN(executionCount);

  useBreadcrumbs('history_scheduled_details', {
    scheduleId: scheduleId ?? '',
    executionCount: executionCountStr ?? '',
  });

  const historyPath = pagePathGetters.history();
  const historyNavProps = useRouterNavigate(historyPath);

  const { data, isLoading, isError } = useScheduledExecutionDetails({
    scheduleId,
    executionCount,
    skip: !isValid,
  });

  const packPath = data?.packId ? pagePathGetters.pack_details({ packId: data.packId }) : '';
  const packNavProps = useRouterNavigate(packPath);

  const formattedTimestamp = useMemo(
    () => (data?.timestamp ? moment(data.timestamp).format('lll') : ''),
    [data?.timestamp]
  );

  const queryData = useMemo(
    () => (data ? mapScheduledDetailsToQueryData(data, scheduleId) : undefined),
    [data, scheduleId]
  );

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...historyNavProps} flush="left" size="xs">
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
        {data && (
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              {data.packName ? (
                <EuiFlexItem grow={false}>
                  <EuiLink {...packNavProps}>
                    <EuiBadge iconType="package">{data.packName}</EuiBadge>
                  </EuiLink>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiText size="s">{formattedTimestamp}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.osquery.scheduledExecutionDetails.executionLabel"
                    defaultMessage="Execution #{executionCount}"
                    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                    values={{ executionCount }}
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
    [historyNavProps, data, formattedTimestamp, packNavProps, executionCount]
  );

  if (!isValid) {
    return <Redirect to={historyPath} />;
  }

  if (isLoading) {
    return (
      <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
        <EuiSpacer size="l" />
        <EuiSkeletonText lines={5} />
      </WithHeaderLayout>
    );
  }

  if (isError) {
    return (
      <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
        <EuiSpacer size="l" />
        <EuiEmptyPrompt
          iconType="warning"
          title={
            <h2>
              <FormattedMessage
                id="xpack.osquery.scheduledExecutionDetails.errorTitle"
                defaultMessage="Unable to load execution details"
              />
            </h2>
          }
          body={
            <FormattedMessage
              id="xpack.osquery.scheduledExecutionDetails.errorBody"
              defaultMessage="There was an error loading the details for this scheduled execution. Please try again."
            />
          }
          actions={
            <EuiButtonEmpty {...historyNavProps} iconType="arrowLeft">
              <FormattedMessage
                id="xpack.osquery.scheduledExecutionDetails.backToHistory"
                defaultMessage="Back to History"
              />
            </EuiButtonEmpty>
          }
        />
      </WithHeaderLayout>
    );
  }

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
      <EuiFlexItem css={tableWrapperCss}>
        <PackQueriesStatusTable
          actionId={scheduleId}
          data={queryData}
          startDate={data?.timestamp}
          showResultsHeader
          scheduleId={scheduleId}
          executionCount={executionCount}
        />
      </EuiFlexItem>
    </WithHeaderLayout>
  );
};

export const ScheduledExecutionDetailsPage = React.memo(ScheduledExecutionDetailsPageComponent);
ScheduledExecutionDetailsPage.displayName = 'ScheduledExecutionDetailsPage';
