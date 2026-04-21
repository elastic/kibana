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
  EuiButtonEmpty,
  EuiSpacer,
  EuiSkeletonText,
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';
import { useRouterNavigate } from '../../common/lib/kibana';
import { pagePathGetters } from '../../common/page_paths';
import {
  fullWidthContentCss,
  WithHeaderLayout,
  WithoutHeaderLayout,
} from '../../components/layouts';
import { useIsExperimentalFeatureEnabled } from '../../common/experimental_features_context';
import { useGoBack } from '../../common/use_go_back';
import {
  useScheduledExecutionDetails,
  mapScheduledDetailsToQueryData,
} from '../../actions/use_scheduled_execution_details';
import { PackQueriesStatusTable } from '../../live_queries/form/pack_queries_status_table';
import { AboutTab } from '../live_queries/details/about_tab';
import type { QueryItemAgents } from '../live_queries/details/about_tab';
import type { LiveQueryDetailsItem } from '../../actions/use_live_query_details';
import type { ScheduledExecutionDetailsItem } from '../../actions/use_scheduled_execution_details';

const tableWrapperCss = {
  paddingLeft: '10px',
};

function mapToLiveQueryDetailsItem(
  details: ScheduledExecutionDetailsItem,
  schedId: string
): LiveQueryDetailsItem {
  return {
    action_id: schedId,
    '@timestamp': details.timestamp,
    agent_all: false,
    agent_ids: [],
    agent_platforms: [],
    agent_policy_ids: [],
    pack_id: details.packId,
    pack_name: details.packName,
    status: 'completed',
    queries: [
      {
        action_id: schedId,
        id: details.queryName || schedId,
        query: details.queryText || '',
        agents: [],
        interval: details.queryInterval,
      },
    ],
  };
}

const ScheduledExecutionDetailsPageComponent = () => {
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
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

  const isResultCountsEnabled = useIsExperimentalFeatureEnabled('resultCountsEnabled');

  const aboutData = useMemo(
    () => (data ? mapToLiveQueryDetailsItem(data, scheduleId) : undefined),
    [data, scheduleId]
  );

  const renderAboutTab = useMemo(() => {
    if (!isResultCountsEnabled || !aboutData) {
      return undefined;
    }

    const AboutTabRenderer = (queryItem: QueryItemAgents) => (
      <AboutTab
        data={aboutData}
        queryItemAgents={queryItem}
        isScheduled
        executionCount={executionCount}
      />
    );
    AboutTabRenderer.displayName = 'AboutTabRenderer';

    return AboutTabRenderer;
  }, [isResultCountsEnabled, aboutData, executionCount]);

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
        {!isHistoryEnabled && (
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
        )}
      </EuiFlexGroup>
    ),
    [historyNavProps, isHistoryEnabled]
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
        renderAboutTab={renderAboutTab}
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
        <EuiButtonEmpty {...historyNavProps} iconType="arrowLeft">
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

  if (isHistoryEnabled) {
    return (
      <WithoutHeaderLayout restrictWidth={false}>
        <div css={fullWidthContentCss}>
          {LeftColumn}
          {content}
        </div>
      </WithoutHeaderLayout>
    );
  }

  if (isLoading || isError) {
    return (
      <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
        {content}
      </WithHeaderLayout>
    );
  }

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
      {tableBlock}
    </WithHeaderLayout>
  );
};

export const ScheduledExecutionDetailsPage = React.memo(ScheduledExecutionDetailsPageComponent);
ScheduledExecutionDetailsPage.displayName = 'ScheduledExecutionDetailsPage';
