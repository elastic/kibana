/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiFlexGroup, EuiPage, EuiPageBody } from '@elastic/eui';
import { checkPermission } from '../privilege/check_privilege';
import { mlNodesAvailable } from '../ml_nodes_check/check_ml_nodes';
import { NavigationMenu } from '../components/navigation_menu';
import { OverviewSideBar } from './components/sidebar';
import { OverviewContent } from './components/content';
import { NodeAvailableWarning } from '../components/node_available_warning';
import { UpgradeWarning } from '../components/upgrade';

export const OverviewPage: FC = () => {
  const disableCreateAnomalyDetectionJob = !checkPermission('canCreateJob') || !mlNodesAvailable();
  const disableCreateAnalyticsButton =
    !mlNodesAvailable() ||
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics');
  return (
    <Fragment>
      <NavigationMenu tabId="overview" />
      <EuiPage data-test-subj="mlPageOverview">
        <EuiPageBody>
          <NodeAvailableWarning />
          <UpgradeWarning />

          <EuiFlexGroup>
            <OverviewSideBar createAnomalyDetectionJobDisabled={disableCreateAnomalyDetectionJob} />
            <OverviewContent
              createAnomalyDetectionJobDisabled={disableCreateAnomalyDetectionJob}
              createAnalyticsJobDisabled={disableCreateAnalyticsButton}
            />
          </EuiFlexGroup>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
