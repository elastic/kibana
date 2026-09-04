/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useParams, Redirect } from 'react-router-dom';
import { EuiButtonEmpty, EuiSpacer, EuiSkeletonText, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';
import { useRouterNavigate } from '../../common/lib/kibana';
import { pagePathGetters } from '../../common/page_paths';
import { fullWidthContentCss, WithoutHeaderLayout } from '../../components/layouts';
import { useGoBack } from '../../common/use_go_back';
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
  const handleGoBack = useGoBack(historyPath);
  const historyNavProps = useRouterNavigate(historyPath, handleGoBack);

  const { data, isLoading, isError } = useScheduledExecutionDetails({
    scheduleId,
    executionCount,
    skip: !isValid,
  });

  const queryData = useMemo(
    () => (data ? mapScheduledDetailsToQueryData(data, scheduleId) : undefined),
    [data, scheduleId]
  );

  const backLink = (
    <EuiButtonEmpty iconType="chevronSingleLeft" {...historyNavProps} flush="left" size="xs">
      <FormattedMessage
        id="xpack.osquery.scheduledExecutionDetails.viewHistoryTitle"
        defaultMessage="View history"
      />
    </EuiButtonEmpty>
  );

  if (!isValid) {
    return <Redirect to={historyPath} />;
  }

  const tableBlock = (
    <div css={tableWrapperCss}>
      <PackQueriesStatusTable
        actionId={scheduleId}
        data={queryData}
        startDate={data?.timestamp}
        showResultsHeader
        scheduleId={scheduleId}
        executionCount={executionCount}
        packName={data?.packName}
      />
    </div>
  );

  const errorPrompt = (
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
        <EuiButtonEmpty {...historyNavProps} iconType="chevronSingleLeft">
          <FormattedMessage
            id="xpack.osquery.scheduledExecutionDetails.backToHistory"
            defaultMessage="Back to History"
          />
        </EuiButtonEmpty>
      }
    />
  );

  const content = isLoading ? (
    <>
      <EuiSpacer size="l" />
      <EuiSkeletonText lines={5} />
    </>
  ) : isError ? (
    <>
      <EuiSpacer size="l" />
      {errorPrompt}
    </>
  ) : (
    <>
      <EuiSpacer size="m" />
      {tableBlock}
    </>
  );

  return (
    <WithoutHeaderLayout restrictWidth={false}>
      <div css={fullWidthContentCss}>
        {backLink}
        {content}
      </div>
    </WithoutHeaderLayout>
  );
};

export const ScheduledExecutionDetailsPage = React.memo(ScheduledExecutionDetailsPageComponent);
ScheduledExecutionDetailsPage.displayName = 'ScheduledExecutionDetailsPage';
