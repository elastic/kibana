/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiStat, EuiTitle } from '@elastic/eui';
import { ml } from '../../../../../services/ml_api_service';
import { getErrorMessage } from '../../../analytics_management/hooks/use_create_analytics_form';
import { RegressionEvaluateResponse } from '../../../../common';

import { ErrorCallout } from './error_callout';

interface Props {
  jobId: string;
  index: string;
  dependentVariable: string;
}

interface LoadEvaluateResult {
  success: boolean;
  eval: RegressionEvaluateResponse | null;
  error: string | null;
}

interface Eval {
  meanSquaredError: number | '';
  rSquared: number | '';
  error: null | string;
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
const DEFAULT_SIG_FIGS = 3;

function getValuesFromResponse(response: RegressionEvaluateResponse) {
  let meanSquaredError =
    response.regression &&
    response.regression.mean_squared_error &&
    response.regression.mean_squared_error.error;
  if (meanSquaredError) {
    meanSquaredError = Number(meanSquaredError.toPrecision(DEFAULT_SIG_FIGS));
  }

  let rSquared =
    response.regression && response.regression.r_squared && response.regression.r_squared.value;
  if (rSquared) {
    rSquared = Number(rSquared.toPrecision(DEFAULT_SIG_FIGS));
  }

  return { meanSquaredError, rSquared };
}

export const EvaluatePanel: FC<Props> = ({ jobId, index, dependentVariable }) => {
  const [trainingEval, setTrainingEval] = useState<Eval>(defaultEval);
  const [generalizationEval, setGeneralizationEval] = useState<Eval>(defaultEval);
  const [isLoadingTraining, setIsLoadingTraining] = useState<boolean>(false);
  const [isLoadingGeneralization, setIsLoadingGeneralization] = useState<boolean>(false);

  const loadEvalData = async (isTraining: boolean) => {
    const results: LoadEvaluateResult = { success: false, eval: null, error: null };

    const config = {
      index,
      query: {
        term: {
          'ml.is_training': {
            value: isTraining,
          },
        },
      },
      evaluation: {
        regression: {
          actual_field: dependentVariable,
          predicted_field: `ml.${dependentVariable}_prediction`,
          metrics: {
            r_squared: {},
            mean_squared_error: {},
          },
        },
      },
    };

    try {
      const evalResult = await ml.dataFrameAnalytics.evaluateDataFrameAnalyticsRegression(config);
      results.success = true;
      results.eval = evalResult;
      return results;
    } catch (e) {
      results.error = getErrorMessage(e);
      return results;
    }
  };

  const loadData = async () => {
    setIsLoadingGeneralization(true);
    setIsLoadingTraining(true);

    const genErrorEval = await loadEvalData(false);

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

    const trainingErrorEval = await loadEvalData(true);

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
      <EuiTitle size="xs">
        <span>
          {i18n.translate('xpack.ml.dataframe.analytics.regressionExploration.jobIdTitle', {
            defaultMessage: 'Job ID {jobId}',
            values: { jobId },
          })}
        </span>
      </EuiTitle>
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
