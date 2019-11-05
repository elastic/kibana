/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiStat, EuiTitle } from '@elastic/eui';
import { idx } from '@kbn/elastic-idx';
import { ErrorCallout } from './error_callout';
import {
  getValuesFromResponse,
  getDependentVar,
  getPredictionFieldName,
  loadEvalData,
  Eval,
  DataFrameAnalyticsConfig,
} from '../../../../common';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';

interface Props {
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus: DATA_FRAME_TASK_STATE;
}

const meanSquaredErrorText = i18n.translate(
  'xpack.ml.dataframe.analytics.regressionExploration.meanSquaredErrorText',
  {
    defaultMessage: 'Mean squared error',
  }
);
const rSquaredText = i18n.translate(
  'xpack.ml.dataframe.analytics.regressionExploration.rSquaredText',
  {
    defaultMessage: 'R squared',
  }
);
const defaultEval: Eval = { meanSquaredError: '', rSquared: '', error: null };

export const EvaluatePanel: FC<Props> = ({ jobConfig, jobStatus }) => {
  const [trainingEval, setTrainingEval] = useState<Eval>(defaultEval);
  const [generalizationEval, setGeneralizationEval] = useState<Eval>(defaultEval);
  const [isLoadingTraining, setIsLoadingTraining] = useState<boolean>(false);
  const [isLoadingGeneralization, setIsLoadingGeneralization] = useState<boolean>(false);

  const index = jobConfig.dest.index;
  const dependentVariable = getDependentVar(jobConfig.analysis);
  const predictionFieldName = getPredictionFieldName(jobConfig.analysis);
  // default is 'ml'
  const resultsField = jobConfig.dest.results_field;

  const loadData = async () => {
    setIsLoadingGeneralization(true);
    setIsLoadingTraining(true);

    const genErrorEval = await loadEvalData({
      isTraining: false,
      index,
      dependentVariable,
      resultsField,
      predictionFieldName,
    });

    if (genErrorEval.success === true && genErrorEval.eval) {
      const { meanSquaredError, rSquared } = getValuesFromResponse(genErrorEval.eval);
      setGeneralizationEval({
        meanSquaredError,
        rSquared,
        error: null,
      });
      setIsLoadingGeneralization(false);
    } else {
      setIsLoadingGeneralization(false);
      setGeneralizationEval({
        meanSquaredError: '',
        rSquared: '',
        error: genErrorEval.error,
      });
    }

    const trainingErrorEval = await loadEvalData({
      isTraining: true,
      index,
      dependentVariable,
      resultsField,
      predictionFieldName,
    });

    if (trainingErrorEval.success === true && trainingErrorEval.eval) {
      const { meanSquaredError, rSquared } = getValuesFromResponse(trainingErrorEval.eval);
      setTrainingEval({
        meanSquaredError,
        rSquared,
        error: null,
      });
      setIsLoadingTraining(false);
    } else {
      setIsLoadingTraining(false);
      setTrainingEval({
        meanSquaredError: '',
        rSquared: '',
        error: genErrorEval.error,
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <EuiPanel>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <span>
              {i18n.translate('xpack.ml.dataframe.analytics.regressionExploration.jobIdTitle', {
                defaultMessage: 'Regression job ID {jobId}',
                values: { jobId: jobConfig.id },
              })}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>{getTaskStateBadge(jobStatus)}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="s">
            <span>
              {i18n.translate(
                'xpack.ml.dataframe.analytics.regressionExploration.generalizationErrorTitle',
                {
                  defaultMessage: 'Generalization error',
                }
              )}
            </span>
          </EuiTitle>
          <EuiSpacer />
          <EuiFlexGroup>
            {generalizationEval.error !== null && <ErrorCallout error={generalizationEval.error} />}
            {generalizationEval.error === null && (
              <Fragment>
                <EuiFlexItem>
                  <EuiStat
                    reverse
                    isLoading={isLoadingGeneralization}
                    title={generalizationEval.meanSquaredError}
                    description={meanSquaredErrorText}
                    titleSize="m"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    reverse
                    isLoading={isLoadingGeneralization}
                    title={generalizationEval.rSquared}
                    description={rSquaredText}
                    titleSize="m"
                  />
                </EuiFlexItem>
              </Fragment>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <span>
              {i18n.translate(
                'xpack.ml.dataframe.analytics.regressionExploration.trainingErrorTitle',
                {
                  defaultMessage: 'Training error',
                }
              )}
            </span>
          </EuiTitle>
          <EuiSpacer />
          <EuiFlexGroup>
            {trainingEval.error !== null && <ErrorCallout error={trainingEval.error} />}
            {trainingEval.error === null && (
              <Fragment>
                <EuiFlexItem>
                  <EuiStat
                    reverse
                    isLoading={isLoadingTraining}
                    title={trainingEval.meanSquaredError}
                    description={meanSquaredErrorText}
                    titleSize="m"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    reverse
                    isLoading={isLoadingTraining}
                    title={trainingEval.rSquared}
                    description={rSquaredText}
                    titleSize="m"
                  />
                </EuiFlexItem>
              </Fragment>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
