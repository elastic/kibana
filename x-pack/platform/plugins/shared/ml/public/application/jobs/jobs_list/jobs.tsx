/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePageUrlState } from '@kbn/ml-url-state';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
import { JobsListView } from './components/jobs_list_view';
import { ML_PAGES } from '../../../../common/constants/locator';
import { HelpMenu } from '../../components/help_menu';
import { useMlKibana } from '../../contexts/kibana';
import { MlPageHeader } from '../../components/page_header';
import { HeaderMenuPortal } from '../../components/header_menu_portal';
import { JobsActionMenu } from '../components/jobs_action_menu';
import { useEnabledFeatures } from '../../contexts/ml';

interface PageUrlState {
  pageKey: typeof ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE;
  pageUrlState: ListingPageUrlState;
}

interface JobsPageProps {
  isMlEnabledInSpace?: boolean;
  lastRefresh?: number;
}

export const getDefaultAnomalyDetectionJobsListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: 'id',
  sortDirection: 'asc',
});

export const JobsPage: FC<JobsPageProps> = ({ isMlEnabledInSpace, lastRefresh }) => {
  const [pageState, setPageState] = usePageUrlState<PageUrlState>(
    ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    getDefaultAnomalyDetectionJobsListState()
  );
  const {
    services: { docLinks },
  } = useMlKibana();
  const { euiTheme } = useEuiTheme();

  const { showNodeInfo } = useEnabledFeatures();
  const helpLink = docLinks.links.ml.anomalyDetection;

  return (
    <>
      <MlPageHeader>
        <FormattedMessage id="xpack.ml.jobsList.title" defaultMessage="Anomaly Detection Jobs" />
      </MlPageHeader>
      <HeaderMenuPortal>
        <JobsActionMenu />
      </HeaderMenuPortal>
      <JobsListView
        euiTheme={euiTheme}
        isMlEnabledInSpace={isMlEnabledInSpace}
        lastRefresh={lastRefresh}
        jobsViewState={pageState}
        onJobsViewStateUpdate={setPageState}
        showNodeInfo={showNodeInfo}
      />
      <HelpMenu docLink={helpLink} />
    </>
  );
};
