/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useRouterNavigate, useKibana } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useLiveQueryDetails } from '../../../actions/use_live_query_details';
import { useUpdateActionTags } from '../../../actions/use_update_action_tags';
import { TagsEditor } from '../../../actions/components/tags_editor';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { PackQueriesStatusTable } from '../../../live_queries/form/pack_queries_status_table';
import { useIsExperimentalFeatureEnabled } from '../../../common/experimental_features_context';

const tableWrapperCss = {
  paddingLeft: '10px',
};

const LiveQueryDetailsPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  const permissions = useKibana().services.application.capabilities.osquery;
  const canEditTags = !!permissions.writeLiveQueries;
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
  useBreadcrumbs(isHistoryEnabled ? 'history_details' : 'live_query_details', {
    liveQueryId: actionId,
  });
  const backNavigationTarget = isHistoryEnabled ? 'history' : 'live_queries';
  const liveQueryListProps = useRouterNavigate(backNavigationTarget);
  const [isLive, setIsLive] = useState(false);
  const { data } = useLiveQueryDetails({ actionId, isLive });
  const { mutate: updateTags } = useUpdateActionTags();

  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      updateTags({ actionId, tags: newTags });
    },
    [actionId, updateTags]
  );

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
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.liveQueryDetails.pageTitle"
                defaultMessage="Live query details"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [liveQueryListProps, isHistoryEnabled]
  );

  useLayoutEffect(() => {
    setIsLive(() => !(data?.status === 'completed'));
  }, [data?.status]);

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
      {isHistoryEnabled && data && (
        <EuiFlexItem css={tableWrapperCss}>
          <TagsEditor
            tags={data.tags ?? []}
            onChange={handleTagsChange}
            isDisabled={!canEditTags}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem css={tableWrapperCss}>
        <PackQueriesStatusTable
          actionId={actionId}
          data={data?.queries}
          startDate={data?.['@timestamp']}
          expirationDate={data?.expiration}
          agentIds={data?.agents}
          showResultsHeader
        />
      </EuiFlexItem>
    </WithHeaderLayout>
  );
};

export const LiveQueryDetailsPage = React.memo(LiveQueryDetailsPageComponent);
