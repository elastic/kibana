/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { OSQUERY_SCHEDULED_INPUT_TYPE } from '../../../../common/constants';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useLiveQueryDetails } from '../../../actions/use_live_query_details';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { PackQueriesStatusTable } from '../../../live_queries/form/pack_queries_status_table';
import { useIsExperimentalFeatureEnabled } from '../../../common/experimental_features_context';

const tableWrapperCss = {
  paddingLeft: '10px',
};

const LiveQueryDetailsPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
  useBreadcrumbs(isHistoryEnabled ? 'history_details' : 'live_query_details', {
    liveQueryId: actionId,
  });
  const backNavigationTarget = isHistoryEnabled ? 'history' : 'live_queries';
  const liveQueryListProps = useRouterNavigate(backNavigationTarget);
  const [isLive, setIsLive] = useState(false);
  const { data } = useLiveQueryDetails({ actionId, isLive });
  const isScheduled = data?.input_type === OSQUERY_SCHEDULED_INPUT_TYPE;

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...liveQueryListProps} flush="left" size="xs">
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
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiText>
                <h1>
                  {isScheduled ? (
                    <FormattedMessage
                      id="xpack.osquery.liveQueryDetails.scheduledPageTitle"
                      defaultMessage="Scheduled query details"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.osquery.liveQueryDetails.pageTitle"
                      defaultMessage="Live query details"
                    />
                  )}
                </h1>
              </EuiText>
            </EuiFlexItem>
            {isScheduled && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  <FormattedMessage
                    id="xpack.osquery.liveQueryDetails.scheduledBadge"
                    defaultMessage="Scheduled"
                  />
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [liveQueryListProps, isHistoryEnabled, isScheduled]
  );

  useLayoutEffect(() => {
    if (isScheduled) {
      setIsLive(false);
    } else {
      setIsLive(() => !(data?.status === 'completed'));
    }
  }, [data?.status, isScheduled]);

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
      <EuiFlexItem css={tableWrapperCss}>
        <PackQueriesStatusTable
          actionId={actionId}
          data={data?.queries}
          startDate={data?.['@timestamp']}
          expirationDate={isScheduled ? undefined : data?.expiration}
          agentIds={isScheduled ? undefined : data?.agents}
          showResultsHeader
          isScheduled={isScheduled}
        />
      </EuiFlexItem>
    </WithHeaderLayout>
  );
};

export const LiveQueryDetailsPage = React.memo(LiveQueryDetailsPageComponent);
