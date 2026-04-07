/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { useGoBack } from '../../../common/use_go_back';
import {
  fullWidthContentCss,
  WithHeaderLayout,
  WithoutHeaderLayout,
} from '../../../components/layouts';
import { useLiveQueryDetails } from '../../../actions/use_live_query_details';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { pagePathGetters } from '../../../common/page_paths';
import { PackQueriesStatusTable } from '../../../live_queries/form/pack_queries_status_table';
import { useIsExperimentalFeatureEnabled } from '../../../common/experimental_features_context';

const tableWrapperCss = {
  paddingLeft: 0,
};

const LiveQueryDetailsPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
  useBreadcrumbs(isHistoryEnabled ? 'history_details' : 'live_query_details', {
    liveQueryId: actionId,
  });
  const backNavigationTarget = isHistoryEnabled ? pagePathGetters.history() : 'live_queries';
  const handleGoBack = useGoBack(backNavigationTarget);
  const liveQueryListProps = useRouterNavigate(backNavigationTarget, handleGoBack);
  const [isLive, setIsLive] = useState(false);
  const { data } = useLiveQueryDetails({ actionId, isLive });

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType="chevronSingleLeft"
            {...liveQueryListProps}
            flush="left"
            size="xs"
          >
            {isHistoryEnabled ? (
              <FormattedMessage
                id="xpack.osquery.liveQueryDetails.viewHistoryTitle"
                defaultMessage="View history"
              />
            ) : (
              <FormattedMessage
                id="xpack.osquery.liveQueryDetails.viewLiveQueriesHistoryTitle"
                defaultMessage="View live queries history"
              />
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {!isHistoryEnabled && (
          <EuiFlexItem>
            <EuiText>
              <h1>
                <FormattedMessage
                  id="xpack.osquery.liveQueryDetails.pageTitle"
                  defaultMessage="Live query details"
                />
              </h1>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
    [liveQueryListProps, isHistoryEnabled]
  );

  useLayoutEffect(() => {
    setIsLive(() => !(data?.status === 'completed'));
  }, [data?.status]);

  const tableBlock = (
    <div css={tableWrapperCss}>
      <PackQueriesStatusTable
        actionId={actionId}
        data={data?.queries}
        startDate={data?.['@timestamp']}
        expirationDate={data?.expiration}
        agentIds={data?.agents}
        showResultsHeader
        tags={data?.tags}
      />
    </div>
  );

  if (isHistoryEnabled) {
    return (
      <WithoutHeaderLayout restrictWidth={false}>
        <div css={fullWidthContentCss}>
          {LeftColumn}
          <EuiSpacer size="m" />
          {tableBlock}
        </div>
      </WithoutHeaderLayout>
    );
  }

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
      <EuiFlexItem css={tableWrapperCss}>
        <PackQueriesStatusTable
          actionId={actionId}
          data={data?.queries}
          startDate={data?.['@timestamp']}
          expirationDate={data?.expiration}
          agentIds={data?.agents}
          showResultsHeader
          tags={data?.tags}
        />
      </EuiFlexItem>
    </WithHeaderLayout>
  );
};

export const LiveQueryDetailsPage = React.memo(LiveQueryDetailsPageComponent);
