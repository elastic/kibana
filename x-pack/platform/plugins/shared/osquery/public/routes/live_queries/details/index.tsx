/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { fullWidthContentCss, WithoutHeaderLayout } from '../../../components/layouts';
import { useLiveQueryDetails } from '../../../actions/use_live_query_details';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { PackQueriesStatusTable } from '../../../live_queries/form/pack_queries_status_table';
import { SavedQueryFlyout } from '../../../saved_queries';
import { useSaveQueryFromDetails } from './use_save_query_from_details';
import { QueryDetailsHeader } from './query_details_header';
import { ResultTabs } from '../../saved_queries/edit/tabs';
import { ExportFiltersProvider } from '../../../results/export_filters_context';

const tableWrapperCss = {
  paddingLeft: 0,
};

const LiveQueryDetailsPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  useBreadcrumbs('history_details', { liveQueryId: actionId });
  const [isLive, setIsLive] = useState(false);
  const { data } = useLiveQueryDetails({ actionId, isLive });

  const {
    canSave,
    showSavedQueryFlyout,
    handleShowSaveQueryFlyout,
    handleCloseSaveQueryFlyout,
    savedQueryDefaultValue,
  } = useSaveQueryFromDetails({ data });

  useLayoutEffect(() => {
    setIsLive(() => !(data?.status === 'completed'));
  }, [data?.status]);

  const onSaveQuery = canSave ? handleShowSaveQueryFlyout : undefined;

  const savedQueryFlyout = showSavedQueryFlyout ? (
    <SavedQueryFlyout onClose={handleCloseSaveQueryFlyout} defaultValue={savedQueryDefaultValue} />
  ) : null;

  const isSingleQuery = !data?.pack_id && (data?.queries?.length ?? 0) === 1;

  return (
    <>
      <WithoutHeaderLayout restrictWidth={false}>
        <div css={fullWidthContentCss}>
          <ExportFiltersProvider>
            {isSingleQuery && data ? (
              <>
                <QueryDetailsHeader actionId={actionId} data={data} onSaveQuery={onSaveQuery} />
                <ResultTabs
                  actionId={data.queries![0].action_id}
                  liveQueryActionId={actionId}
                  agentIds={data.agents}
                  startDate={data['@timestamp']}
                  endDate={data.expiration}
                  ecsMapping={data.queries![0].ecs_mapping}
                  failedAgentsCount={data.queries![0].failed ?? 0}
                  error={data.queries![0].error}
                />
              </>
            ) : (
              <div css={tableWrapperCss}>
                <PackQueriesStatusTable
                  actionId={actionId}
                  data={data?.queries}
                  startDate={data?.['@timestamp']}
                  expirationDate={data?.expiration}
                  agentIds={data?.agents}
                  showResultsHeader
                  hideResultsTitle
                  tags={data?.tags}
                  onSaveQuery={onSaveQuery}
                />
              </div>
            )}
          </ExportFiltersProvider>
        </div>
      </WithoutHeaderLayout>
      {savedQueryFlyout}
    </>
  );
};

export const LiveQueryDetailsPage = React.memo(LiveQueryDetailsPageComponent);
