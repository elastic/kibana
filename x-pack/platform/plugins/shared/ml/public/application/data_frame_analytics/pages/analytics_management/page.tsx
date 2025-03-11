/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePageUrlState, type ListingPageUrlState } from '@kbn/ml-url-state';
import { DataFrameAnalyticsList } from './components/analytics_list';
import { useRefreshInterval } from './components/analytics_list/use_refresh_interval';
import { NodeAvailableWarning } from '../../../components/node_available_warning';
import { SavedObjectsWarning } from '../../../components/saved_objects_warning';
import { UpgradeWarning } from '../../../components/upgrade';
import { DataFrameAnalyticsListColumn } from './components/analytics_list/common';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { HelpMenu } from '../../../components/help_menu';
import { useMlKibana } from '../../../contexts/kibana';
import { useRefreshAnalyticsList } from '../../common';
import { MlPageHeader } from '../../../components/page_header';
import { CreateAnalyticsButton } from './components/create_analytics_button/create_analytics_button';

interface PageUrlState {
  pageKey: typeof ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE;
  pageUrlState: ListingPageUrlState;
}

export const getDefaultDFAListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: DataFrameAnalyticsListColumn.id,
  sortDirection: 'asc',
});

export const Page: FC = () => {
  const [blockRefresh, setBlockRefresh] = useState(false);

  const [dfaPageState, setDfaPageState] = usePageUrlState<PageUrlState>(
    ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
    getDefaultDFAListState()
  );

  useRefreshInterval(setBlockRefresh);
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useRefreshAnalyticsList({ isLoading: setIsLoading });

  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.dataFrameAnalytics;
  return (
    <>
      <MlPageHeader>
        <EuiFlexGroup grow={false} direction="row" gutterSize="s">
          <EuiFlexItem grow={true}>
            <FormattedMessage
              id="xpack.ml.dataframe.analyticsList.title"
              defaultMessage="Data Frame Analytics Jobs"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} justifyContent="flexEnd">
            <CreateAnalyticsButton size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>

      <NodeAvailableWarning />

      <SavedObjectsWarning onCloseFlyout={refresh} forceRefresh={isLoading} />
      <UpgradeWarning />

      <DataFrameAnalyticsList
        blockRefresh={blockRefresh}
        pageState={dfaPageState}
        updatePageState={setDfaPageState}
      />
      <HelpMenu docLink={helpLink} />
    </>
  );
};
