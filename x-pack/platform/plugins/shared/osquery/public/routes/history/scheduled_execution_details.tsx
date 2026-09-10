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
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';
import { QueryDetailsHeader } from '../live_queries/details/query_details_header';
import { ResultTabs } from '../saved_queries/edit/tabs';
import { ExportFiltersProvider } from '../../results/export_filters_context';
import type { LiveQueryDetailsItem } from '../../actions/use_live_query_details';

const tableWrapperCss = {
  paddingLeft: '10px',
};

// Results for one execution land shortly after its scheduled time; a 24h window
// comfortably covers agent check-in lag without pulling in neighbouring executions.
const EXECUTION_WINDOW_MS = 24 * 60 * 60 * 1000;

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

  // A scheduled execution always represents exactly one query at one execution count
  // (see `mapScheduledDetailsToQueryData`), so it uses the same single-query header as
  // ad-hoc live queries rather than the multi-row pack table.
  const headerData = useMemo<LiveQueryDetailsItem | undefined>(() => {
    if (!queryData) return undefined;

    // Anchor the View-in links to an absolute window around this execution. Without an
    // end bound they fall back to a relative `now-7d`, which silently misses any
    // execution older than a week and makes Discover/Lens look empty.
    const timestamp = data?.timestamp;
    const expiration = timestamp
      ? new Date(new Date(timestamp).getTime() + EXECUTION_WINDOW_MS).toISOString()
      : undefined;

    return {
      action_id: scheduleId,
      '@timestamp': timestamp ?? '',
      expiration,
      queries: queryData,
      // A scheduled run targets agents via its pack policy, not an explicit
      // selection, so there is no agent selection to surface in the header.
      agent_all: false,
      agent_ids: [],
      agent_platforms: [],
      agent_policy_ids: [],
    };
  }, [queryData, scheduleId, data?.timestamp]);

  if (!isValid) {
    return <Redirect to={historyPath} />;
  }

  const detailsBlock =
    headerData && queryData ? (
      <ExportFiltersProvider>
        <QueryDetailsHeader
          actionId={scheduleId}
          data={headerData}
          scheduleId={scheduleId}
          executionCount={executionCount}
          packName={data?.packName}
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
      <div css={tableWrapperCss}>
        <PackQueriesStatusTable
          actionId={scheduleId}
          data={queryData}
          startDate={data?.timestamp}
          showResultsHeader
          hideResultsTitle
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
    // No leading spacer: the page container already supplies padding, and the header
    // starts with its own title block.
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
