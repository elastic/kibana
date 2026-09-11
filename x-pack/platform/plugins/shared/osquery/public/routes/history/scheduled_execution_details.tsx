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
import {
  useScheduledExecutionDetails,
  mapScheduledDetailsToQueryData,
} from '../../actions/use_scheduled_execution_details';
import { QueryDetailsHeader } from '../live_queries/details/query_details_header';
import { ResultTabs } from '../saved_queries/edit/tabs';
import { ExportFiltersProvider } from '../../results/export_filters_context';
import { getPackViewDateWindow } from '../../common/pack_view_date_window';
import type { LiveQueryDetailsItem } from '../../actions/use_live_query_details';

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

  const queryData = useMemo(
    () => (data ? mapScheduledDetailsToQueryData(data, scheduleId) : undefined),
    [data, scheduleId]
  );

  const headerData = useMemo<LiveQueryDetailsItem | undefined>(() => {
    if (!queryData) return undefined;

    return {
      action_id: scheduleId,
      '@timestamp': data?.timestamp ?? '',
      queries: queryData,
      agent_all: false,
      agent_ids: [],
      agent_platforms: [],
      agent_policy_ids: [],
    };
  }, [queryData, scheduleId, data?.timestamp]);

  // `data.timestamp` is the newest response document for this execution, so the
  // View-in window has to bracket it in both directions — anchoring the start there
  // would exclude every earlier agent response.
  const viewInWindow = useMemo(
    () => getPackViewDateWindow({ isScheduled: true, timestamp: data?.timestamp }),
    [data?.timestamp]
  );

  if (!isValid) {
    return <Redirect to={historyPath} />;
  }

  const backToHistoryButton = (
    <EuiButtonEmpty {...historyNavProps} iconType="chevronSingleLeft">
      <FormattedMessage
        id="xpack.osquery.scheduledExecutionDetails.backToHistory"
        defaultMessage="Back to History"
      />
    </EuiButtonEmpty>
  );

  const emptyPrompt = (
    <EuiEmptyPrompt
      iconType="search"
      title={
        <h2>
          <FormattedMessage
            id="xpack.osquery.scheduledExecutionDetails.emptyTitle"
            defaultMessage="No details for this execution"
          />
        </h2>
      }
      body={
        <FormattedMessage
          id="xpack.osquery.scheduledExecutionDetails.emptyBody"
          defaultMessage="This scheduled execution has no recorded results yet."
        />
      }
      actions={backToHistoryButton}
    />
  );

  const detailsBlock =
    headerData && queryData?.length ? (
      <ExportFiltersProvider>
        <QueryDetailsHeader
          actionId={scheduleId}
          data={headerData}
          scheduleId={scheduleId}
          executionCount={executionCount}
          packName={data?.packName}
          viewInStartDate={viewInWindow.startDate}
          viewInEndDate={viewInWindow.endDate}
        />
        <ResultTabs
          actionId={queryData[0].action_id}
          startDate={data?.timestamp}
          failedAgentsCount={queryData[0].failed ?? 0}
          scheduleId={scheduleId}
          executionCount={executionCount}
        />
      </ExportFiltersProvider>
    ) : (
      emptyPrompt
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
      actions={backToHistoryButton}
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
    detailsBlock
  );

  return (
    <WithoutHeaderLayout restrictWidth={false}>
      <div css={fullWidthContentCss}>{content}</div>
    </WithoutHeaderLayout>
  );
};

export const ScheduledExecutionDetailsPage = React.memo(ScheduledExecutionDetailsPageComponent);
ScheduledExecutionDetailsPage.displayName = 'ScheduledExecutionDetailsPage';
