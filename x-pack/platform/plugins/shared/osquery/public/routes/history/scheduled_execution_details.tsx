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
import { i18n } from '@kbn/i18n';
import { AppHeader, AppHeaderLoading } from '@kbn/app-header';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';
import { useHistoryBack } from '../../common/hooks/use_history_back';
import { useAddIntegrationsOnlyMenu } from '../../common/hooks/use_add_integrations_menu_item';
import { useRouterNavigate, useKibana } from '../../common/lib/kibana';
import { pagePathGetters } from '../../common/page_paths';
import { resultsContentCss, WithoutHeaderLayout } from '../../components/layouts';
import { removeMultilines } from '../../../common/utils/build_query/remove_multilines';
import {
  useScheduledExecutionDetails,
  mapScheduledDetailsToQueryData,
} from '../../actions/use_scheduled_execution_details';
import { ResultTabs } from '../saved_queries/edit/tabs';
import { ExportFiltersProvider } from '../../results/export_filters_context';
import { getPackViewDateWindow } from '../../common/pack_view_date_window';
import type { LiveQueryDetailsItem } from '../../actions/use_live_query_details';
import { QueryResultsAppHeader } from '../live_queries/details/query_results_app_header';
import { useScheduledRunMetadata } from './use_scheduled_run_metadata';

const FALLBACK_TITLE = i18n.translate('xpack.osquery.liveQueryActionResults.results', {
  defaultMessage: 'Query results',
});

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

  const { docLinks } = useKibana().services;
  const historyPath = pagePathGetters.history();
  const historyNavProps = useRouterNavigate(historyPath);
  const historyBack = useHistoryBack();
  const fallbackMenu = useAddIntegrationsOnlyMenu();

  const { data, isLoading, isError } = useScheduledExecutionDetails({
    scheduleId,
    executionCount,
    skip: !isValid,
  });

  const queryData = useMemo(
    () => (data ? mapScheduledDetailsToQueryData(data, scheduleId) : undefined),
    [data, scheduleId]
  );

  const hasExecutionHits = Boolean(data?.timestamp && (data.agentCount > 0 || data.totalRows > 0));

  const headerData = useMemo<LiveQueryDetailsItem | undefined>(() => {
    if (!queryData || !hasExecutionHits) return undefined;

    return {
      action_id: scheduleId,
      '@timestamp': data?.timestamp ?? '',
      queries: queryData,
      agent_all: false,
      agent_ids: [],
      agent_platforms: [],
      agent_policy_ids: [],
    };
  }, [queryData, scheduleId, data?.timestamp, hasExecutionHits]);

  // `data.timestamp` is the newest response document for this execution, so the
  // View-in window has to bracket it in both directions — anchoring the start there
  // would exclude every earlier agent response.
  const viewInWindow = useMemo(
    () => getPackViewDateWindow({ isScheduled: true, timestamp: data?.timestamp }),
    [data?.timestamp]
  );

  const scheduledMetadata = useScheduledRunMetadata({
    packName: data?.packName,
    executionCount,
    timestamp: data?.timestamp,
  });

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

  const firstQueryData = headerData && queryData?.length ? queryData[0] : undefined;

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

  if (isLoading) {
    return (
      <>
        <AppHeaderLoading back={historyBack} />
        <WithoutHeaderLayout restrictWidth={false}>
          <div css={resultsContentCss}>
            <EuiSpacer size="l" />
            <EuiSkeletonText lines={5} />
          </div>
        </WithoutHeaderLayout>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <AppHeader
          title={FALLBACK_TITLE}
          back={historyBack}
          menu={fallbackMenu}
          docLink={docLinks.links.osquery.guide}
        />
        <WithoutHeaderLayout restrictWidth={false}>
          <div css={resultsContentCss}>
            <EuiSpacer size="l" />
            {errorPrompt}
          </div>
        </WithoutHeaderLayout>
      </>
    );
  }

  if (!firstQueryData || !headerData) {
    return (
      <>
        <AppHeader
          title={FALLBACK_TITLE}
          back={historyBack}
          menu={fallbackMenu}
          docLink={docLinks.links.osquery.guide}
        />
        <WithoutHeaderLayout restrictWidth={false}>
          <div css={resultsContentCss}>{emptyPrompt}</div>
        </WithoutHeaderLayout>
      </>
    );
  }

  // The header's "Export results" reads the totals `ResultTabs` publishes, so both share one
  // `ExportFiltersProvider`.
  return (
    <ExportFiltersProvider>
      <QueryResultsAppHeader
        actionId={scheduleId}
        data={headerData}
        title={removeMultilines(firstQueryData.query) || FALLBACK_TITLE}
        back={historyBack}
        metadata={scheduledMetadata}
        docLink={docLinks.links.osquery.guide}
        scheduleId={scheduleId}
        executionCount={executionCount}
        viewInStartDate={viewInWindow.startDate}
        viewInEndDate={viewInWindow.endDate}
        viewInMode={viewInWindow.mode}
      />
      <WithoutHeaderLayout restrictWidth={false}>
        <div css={resultsContentCss}>
          <ResultTabs
            hasPanel={false}
            actionId={firstQueryData.action_id}
            startDate={data?.timestamp}
            failedAgentsCount={firstQueryData.failed ?? 0}
            scheduleId={scheduleId}
            executionCount={executionCount}
          />
        </div>
      </WithoutHeaderLayout>
    </ExportFiltersProvider>
  );
};

export const ScheduledExecutionDetailsPage = React.memo(ScheduledExecutionDetailsPageComponent);
ScheduledExecutionDetailsPage.displayName = 'ScheduledExecutionDetailsPage';
