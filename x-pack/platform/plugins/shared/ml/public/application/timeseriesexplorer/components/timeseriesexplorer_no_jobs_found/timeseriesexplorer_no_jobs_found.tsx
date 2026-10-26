/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering an empty prompt when no jobs were found.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import adImage from '../../../jobs/jobs_list/components/anomaly_detection_empty_state/machine_learning_cog.svg';
import { useMlKibana } from '../../../contexts/kibana';
import { useCreateAndNavigateToManagementMlLink } from '../../../contexts/kibana/use_create_url';
import { usePermissionCheck } from '../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../ml_nodes_check';
import { MLEmptyPromptCard } from '../../../components/overview/ml_empty_prompt_card';

export const TimeseriesexplorerNoJobsFound = () => {
  const canCreateJob = usePermissionCheck('canCreateJob');
  const disableCreateAnomalyDetectionJob = !canCreateJob || !mlNodesAvailable();

  const {
    services: { docLinks },
  } = useMlKibana();

  const redirectToCreateJobSelectIndexPage = useCreateAndNavigateToManagementMlLink(
    ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_INDEX,
    'anomaly_detection'
  );

  return (
    <MLEmptyPromptCard
      iconSrc={adImage}
      iconAlt={i18n.translate('xpack.ml.timeSeriesExplorer.pageTitle', {
        defaultMessage: 'Single Metric Viewer',
      })}
      title={i18n.translate('xpack.ml.timeSeriesExplorer.pageTitle', {
        defaultMessage: 'Single Metric Viewer',
      })}
      body={
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.timeSeriesExplorer.noJobsFound.emptyPromptText"
            defaultMessage="Analyze time series data and identify anomalous patterns in your data set with Elastic machine learning."
          />
        </EuiText>
      }
      actions={
        <EuiButton
          color="primary"
          fill
          iconType="plusCircle"
          onClick={redirectToCreateJobSelectIndexPage}
          isDisabled={disableCreateAnomalyDetectionJob}
          data-test-subj="mlCreateNewSingleMetricJobButton"
        >
          <FormattedMessage
            id="xpack.ml.timeSeriesExplorer.createNewSingleMetricJobLinkText"
            defaultMessage="Create new single metric job"
          />
        </EuiButton>
      }
      docsLink={docLinks.links.ml.anomalyDetection}
      docsLinkDataTestSubj="mlSingleMetricViewerReadDocumentationButton"
      centered
      data-test-subj="mlNoSingleMetricJobsFound"
    />
  );
};
