/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
// import { ErrorCallout } from './error_callout';
import {
  // getValuesFromResponse,
  // getDependentVar,
  // getPredictionFieldName,
  // loadEvalData,
  // Eval,
  DataFrameAnalyticsConfig,
} from '../../../../common';
// import { ml } from '../../../../../services/ml_api_service';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import {
  // getEvalQueryBody,
  // isRegressionResultsSearchBoolQuery,
  RegressionResultsSearchQuery,
  // SearchQuery,
} from '../../../../common/analytics';

interface Props {
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus: DATA_FRAME_TASK_STATE;
  searchQuery: RegressionResultsSearchQuery;
}

export const EvaluatePanel: FC<Props> = ({ jobConfig, jobStatus, searchQuery }) => {
  // const index = jobConfig.dest.index;
  // const dependentVariable = getDependentVar(jobConfig.analysis);
  // const predictionFieldName = getPredictionFieldName(jobConfig.analysis);
  // // default is 'ml'
  // const resultsField = jobConfig.dest.results_field;

  return (
    <EuiPanel>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <span>
              {i18n.translate('xpack.ml.dataframe.analytics.classificationExploration.jobIdTitle', {
                defaultMessage: 'Classification job ID {jobId}',
                values: { jobId: jobConfig.id },
              })}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>{getTaskStateBadge(jobStatus)}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
