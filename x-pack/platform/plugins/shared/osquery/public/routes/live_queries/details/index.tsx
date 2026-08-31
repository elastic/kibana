/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useLayoutEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { useGoBack } from '../../../common/use_go_back';
import { fullWidthContentCss, WithoutHeaderLayout } from '../../../components/layouts';
import { useLiveQueryDetails } from '../../../actions/use_live_query_details';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { pagePathGetters } from '../../../common/page_paths';
import { PackQueriesStatusTable } from '../../../live_queries/form/pack_queries_status_table';
import { SavedQueryFlyout } from '../../../saved_queries';
import { useSaveQueryFromDetails } from './use_save_query_from_details';

const tableWrapperCss = {
  paddingLeft: 0,
};

const LiveQueryDetailsPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  useBreadcrumbs('history_details', { liveQueryId: actionId });
  const handleGoBack = useGoBack(pagePathGetters.history());
  const liveQueryListProps = useRouterNavigate(pagePathGetters.history(), handleGoBack);
  const [isLive, setIsLive] = useState(false);
  const { data } = useLiveQueryDetails({ actionId, isLive });

  const {
    canSave,
    showSavedQueryFlyout,
    handleShowSaveQueryFlyout,
    handleCloseSaveQueryFlyout,
    savedQueryDefaultValue,
  } = useSaveQueryFromDetails({ data });

  const backLink = (
    <EuiButtonEmpty iconType="chevronSingleLeft" {...liveQueryListProps} flush="left" size="xs">
      <FormattedMessage
        id="xpack.osquery.liveQueryDetails.viewHistoryTitle"
        defaultMessage="View history"
      />
    </EuiButtonEmpty>
  );

  useLayoutEffect(() => {
    setIsLive(() => !(data?.status === 'completed'));
  }, [data?.status]);

  const onSaveQuery = canSave ? handleShowSaveQueryFlyout : undefined;

  const savedQueryFlyout = showSavedQueryFlyout ? (
    <SavedQueryFlyout onClose={handleCloseSaveQueryFlyout} defaultValue={savedQueryDefaultValue} />
  ) : null;

  return (
    <>
      <WithoutHeaderLayout restrictWidth={false}>
        <div css={fullWidthContentCss}>
          {backLink}
          <EuiSpacer size="m" />
          <div css={tableWrapperCss}>
            <PackQueriesStatusTable
              actionId={actionId}
              data={data?.queries}
              startDate={data?.['@timestamp']}
              expirationDate={data?.expiration}
              agentIds={data?.agents}
              showResultsHeader
              tags={data?.tags}
              onSaveQuery={onSaveQuery}
            />
          </div>
        </div>
      </WithoutHeaderLayout>
      {savedQueryFlyout}
    </>
  );
};

export const LiveQueryDetailsPage = React.memo(LiveQueryDetailsPageComponent);
