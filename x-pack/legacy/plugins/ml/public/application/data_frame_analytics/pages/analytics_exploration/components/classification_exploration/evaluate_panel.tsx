/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
// import { ErrorCallout } from './error_callout';
import {
  getDependentVar,
  getPredictionFieldName,
  loadEvalData,
  // Eval,
  DataFrameAnalyticsConfig,
} from '../../../../common';
// import { ml } from '../../../../../services/ml_api_service';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import {
  // getEvalQueryBody,
  isRegressionResultsSearchBoolQuery,
  RegressionResultsSearchQuery,
  ANALYSIS_CONFIG_TYPE,
  // SearchQuery,
} from '../../../../common/analytics';

interface Props {
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus: DATA_FRAME_TASK_STATE;
  searchQuery: RegressionResultsSearchQuery;
}

export const EvaluatePanel: FC<Props> = ({ jobConfig, jobStatus, searchQuery }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cofusionMatrixData, setConfusionMatrixData] = useState<any>({}); // TODO: update type

  const index = jobConfig.dest.index;
  const dependentVariable = getDependentVar(jobConfig.analysis);
  const predictionFieldName = getPredictionFieldName(jobConfig.analysis);
  // default is 'ml'
  const resultsField = jobConfig.dest.results_field;

  const loadData = async ({
    isTrainingClause,
    ignoreDefaultQuery = true,
  }: {
    isTrainingClause: any; // TODO: update type
    ignoreDefaultQuery?: boolean;
  }) => {
    setIsLoading(true);

    const evalData = await loadEvalData({
      isTraining: false,
      index,
      dependentVariable,
      resultsField,
      predictionFieldName,
      searchQuery,
      ignoreDefaultQuery,
      jobType: ANALYSIS_CONFIG_TYPE.CLASSIFICATION,
    });

    if (evalData.success === true && evalData.eval) {
      // @ts-ignore
      const confusionMatrix =
        // @ts-ignore
        evalData.eval?.classification?.multiclass_confusion_matrix?.confusion_matrix;
      setConfusionMatrixData(confusionMatrix || {});
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setConfusionMatrixData({});
    }
  };

  useEffect(() => {
    const hasIsTrainingClause =
      isRegressionResultsSearchBoolQuery(searchQuery) &&
      searchQuery.bool.must.filter(
        (clause: any) => clause.match && clause.match[`${resultsField}.is_training`] !== undefined
      );
    const isTrainingClause =
      hasIsTrainingClause &&
      hasIsTrainingClause[0] &&
      hasIsTrainingClause[0].match[`${resultsField}.is_training`];

    loadData({ isTrainingClause });
  }, [JSON.stringify(searchQuery)]);

  if (isLoading === true) {
    // TODO: update this to proper loading
    return <EuiPanel>Loading...</EuiPanel>;
  }

  return (
    <EuiPanel>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <span>
                  {i18n.translate(
                    'xpack.ml.dataframe.analytics.classificationExploration.jobIdTitle',
                    {
                      defaultMessage: 'Classification job ID {jobId}',
                      values: { jobId: jobConfig.id },
                    }
                  )}
                </span>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span>{getTaskStateBadge(jobStatus)}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <span>{JSON.stringify(cofusionMatrixData, null, 2)}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
