/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect } from 'react';
import { EuiSpacer, useEuiTheme } from '@elastic/eui';
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
import { getMlNodeCount } from '../../ml_nodes_check/check_ml_nodes';
import {
  AnomalyDetectionSettingsButton,
  SuppliedConfigurationsButton,
  SynchronizeSavedObjectsButton,
} from './components/top_level_actions';
import { NewJobButton } from './components/new_job_button';
import { usePermissionCheck } from '../../capabilities/check_capabilities';
import { ImportJobsFlyout } from '../../components/import_export_jobs/import_jobs_flyout';
import { ExportJobsFlyout } from '../../components/import_export_jobs';
import { PageTitle } from '../../components/page_title';

interface PageUrlState {
  pageKey: typeof ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE_FOR_URL;
  pageUrlState: ListingPageUrlState;
}

interface JobsPageProps {
  isMlEnabledInSpace?: boolean;
  lastRefresh?: number;
  refreshList: () => void;
}

export const getDefaultAnomalyDetectionJobsListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: 'id',
  sortDirection: 'asc',
});

export const JobsPage: FC<JobsPageProps> = ({ isMlEnabledInSpace, lastRefresh, refreshList }) => {
  const [pageState, setPageState] = usePageUrlState<PageUrlState>(
    ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE_FOR_URL,
    getDefaultAnomalyDetectionJobsListState()
  );
  const {
    services: {
      docLinks,
      mlServices: { mlApi },
    },
  } = useMlKibana();
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    getMlNodeCount(mlApi);
  }, [mlApi]);

  const { showNodeInfo } = useEnabledFeatures();
  const helpLink = docLinks.links.ml.anomalyDetection;
  const [canCreateJob] = usePermissionCheck(['canCreateJob']);

  return (
    <>
      <MlPageHeader
        wrapHeader
        rightSideItems={[
          <SuppliedConfigurationsButton key="supplied-configurations-button" />,
          <AnomalyDetectionSettingsButton key="anomaly-detection-settings-button" />,
          <SynchronizeSavedObjectsButton
            key="synchronize-saved-objects-button"
            refreshJobs={refreshList}
          />,
          <ExportJobsFlyout
            key="export-jobs-flyout"
            isDisabled={!canCreateJob}
            currentTab={'anomaly-detector'}
          />,
          <ImportJobsFlyout
            key="import-jobs-flyout"
            isDisabled={!canCreateJob}
            onImportComplete={refreshList}
          />,
          <NewJobButton key="new-job-button" size="m" />,
        ]}
      >
        <PageTitle
          title={
            <FormattedMessage
              id="xpack.ml.jobsList.title"
              defaultMessage="Anomaly Detection Jobs"
            />
          }
        />
      </MlPageHeader>
      <HeaderMenuPortal>
        <JobsActionMenu />
      </HeaderMenuPortal>
      <EuiSpacer size="m" />
      <JobsListView
        euiTheme={euiTheme}
        isMlEnabledInSpace={isMlEnabledInSpace}
        lastRefresh={lastRefresh}
        jobsViewState={pageState}
        onJobsViewStateUpdate={setPageState}
        showNodeInfo={showNodeInfo}
        canCreateJob={canCreateJob}
      />
      <HelpMenu docLink={helpLink} />
    </>
  );
};
