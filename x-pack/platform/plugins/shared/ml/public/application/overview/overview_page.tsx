/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCard, EuiFlexItem, EuiFlexGroup, EuiIcon, EuiImage } from '@elastic/eui';
// import { i18n } from '@kbn/i18n';
// import { mlTimefilterRefresh$, useTimefilter } from '@kbn/ml-date-picker';
// import { useStorage } from '@kbn/ml-local-storage';
// import { OverviewStatsBar } from '../../../components/collapsible_panel/collapsible_panel';
// import { ML_PAGES } from '../../../../../common/constants/locator';
// import type { MlStorageKey, TMlStorageMapped } from '../../../../../common/types/storage';
// import { ML_OVERVIEW_PANELS } from '../../../../../common/types/storage';
// import { CollapsiblePanel } from '../../../components/collapsible_panel';
import { usePermissionCheck } from '../capabilities/check_capabilities';
import { mlNodesAvailable } from '../ml_nodes_check';
// import { OverviewContent } from './content';
// import { NodeAvailableWarning } from '../../../components/node_available_warning';
// import { JobsAwaitingNodeWarning } from '../../../components/jobs_awaiting_node_warning';
// import { SavedObjectsWarning } from '../../../components/saved_objects_warning';
// import { UpgradeWarning } from '../../../components/upgrade';
import { HelpMenu } from '../components/help_menu';
import { useMlKibana } from '../contexts/kibana'; // useMlLink
// import { NodesList } from '../../../memory_usage/nodes_overview';
// import { getMlNodesCount } from '../../../ml_nodes_check/check_ml_nodes';
import { MlPageHeader } from '../components/page_header';
import adImage from '../jobs/jobs_list/components/anomaly_detection_empty_state/anomaly_detection_kibana.png';
import dfaImage from '../data_frame_analytics/pages/analytics_management/components/empty_prompt/data_frame_analytics_kibana.png';

export const overviewPanelDefaultState = Object.freeze({
  nodes: true,
  adJobs: true,
  dfaJobs: true,
});

export const OverviewPage: FC = () => {
  const [canViewMlNodes, canCreateJob] = usePermissionCheck(['canViewMlNodes', 'canCreateJob']);

  const disableCreateAnomalyDetectionJob = !canCreateJob || !mlNodesAvailable();
  const {
    services: { docLinks },
  } = useMlKibana();
  // const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

  return (
    <>
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.overview.pageHeader"
              defaultMessage="Welcome to the Machine Learning Hub"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiCard
            icon={<EuiImage size="m" src={adImage} alt="anomaly_detection" />}
            layout="horizontal"
            title={
              <FormattedMessage
                id="xpack.ml.overview.anomalyDetection.overviewADJobsTitle"
                defaultMessage="Spot anomalies faster"
              />
            }
            description="Start automatically detecting anomalies hiding in your time series data and resolve issues faster."
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCard
            icon={<EuiImage size="m" src={dfaImage} alt="data_frame_analytics" />}
            layout="horizontal"
            title="Trained analysis of your data"
            description="Train outlier detection, regression, or classification machine learning models using data frame analytics."
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <HelpMenu docLink={docLinks.links.ml.guide} />
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default OverviewPage;
