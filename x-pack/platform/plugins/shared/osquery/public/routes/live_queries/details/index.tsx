/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AppHeader, AppHeaderLoading } from '@kbn/app-header';

import { resultsContentCss, WithoutHeaderLayout } from '../../../components/layouts';
import { useLiveQueryDetails } from '../../../actions/use_live_query_details';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { useHistoryBack } from '../../../common/hooks/use_history_back';
import { useKibana } from '../../../common/lib/kibana';
import { removeMultilines } from '../../../../common/utils/build_query/remove_multilines';
import { PackQueriesStatusTable } from '../../../live_queries/form/pack_queries_status_table';
import { SavedQueryFlyout } from '../../../saved_queries';
import { useSaveQueryFromDetails } from './use_save_query_from_details';
import { useRunByMetadata } from './use_run_by_metadata';
import { useAddIntegrationsOnlyMenu } from '../../../common/hooks/use_add_integrations_menu_item';
import { QueryResultsAppHeader } from './query_results_app_header';
import { ResultTabs } from '../../saved_queries/edit/tabs';
import { ExportFiltersProvider } from '../../../results/export_filters_context';

const tableWrapperCss = {
  paddingLeft: 0,
};

const PACK_RESULTS_TITLE = i18n.translate('xpack.osquery.liveQueryActionResults.results', {
  defaultMessage: 'Query results',
});

const LiveQueryDetailsPageComponent = () => {
  const { actionId } = useParams<{ actionId: string }>();
  useBreadcrumbs('history_details', { liveQueryId: actionId });
  const { docLinks } = useKibana().services;
  const historyBack = useHistoryBack();
  const [isLive, setIsLive] = useState(false);
  const { data, isLoading } = useLiveQueryDetails({ actionId, isLive });

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

  const query = data?.queries?.[0];
  const isSingleQuery = !!data && !data.pack_id && data.queries?.length === 1 && query != null;

  const runByMetadata = useRunByMetadata({
    userId: data?.user_id,
    userProfileUid: data?.user_profile_uid,
    timestamp: data?.['@timestamp'],
  });

  const packRunMenu = useAddIntegrationsOnlyMenu();

  const isInitialLoading = isLoading && !data;

  return (
    <>
      {isInitialLoading ? (
        <>
          <AppHeaderLoading back={historyBack} />
          <WithoutHeaderLayout restrictWidth={false}>
            <div css={resultsContentCss}>
              <div data-test-subj="query-details-loading">
                <EuiSpacer size="l" />
                <EuiSkeletonText lines={5} />
              </div>
            </div>
          </WithoutHeaderLayout>
        </>
      ) : isSingleQuery ? (
        // The header's "Export results" reads the totals `ResultTabs` publishes, so both share
        // one `ExportFiltersProvider`.
        <ExportFiltersProvider>
          <QueryResultsAppHeader
            actionId={actionId}
            data={data}
            title={removeMultilines(query.query)}
            back={historyBack}
            metadata={runByMetadata}
            docLink={docLinks.links.osquery.guide}
            onSaveQuery={onSaveQuery}
          />
          <WithoutHeaderLayout restrictWidth={false}>
            <div css={resultsContentCss}>
              <ResultTabs
                hasPanel={false}
                actionId={query.action_id}
                liveQueryActionId={actionId}
                agentIds={data.agents}
                startDate={data['@timestamp']}
                endDate={data.expiration}
                ecsMapping={query.ecs_mapping}
                failedAgentsCount={query.failed ?? 0}
                error={query.error}
              />
            </div>
          </WithoutHeaderLayout>
        </ExportFiltersProvider>
      ) : (
        // Pack runs: the pack name is the title (as in the History list); the pack-level and
        // per-query actions stay in `PackQueriesStatusTable`.
        <>
          <AppHeader
            title={data?.pack_name || PACK_RESULTS_TITLE}
            back={historyBack}
            metadata={data ? runByMetadata : undefined}
            menu={packRunMenu}
            docLink={docLinks.links.osquery.guide}
          />
          <WithoutHeaderLayout restrictWidth={false}>
            <div css={resultsContentCss}>
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
            </div>
          </WithoutHeaderLayout>
        </>
      )}
      {savedQueryFlyout}
    </>
  );
};

export const LiveQueryDetailsPage = React.memo(LiveQueryDetailsPageComponent);
