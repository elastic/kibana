/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { ErrorCallout } from './error_callout';
import {
  getValuesFromResponse,
  getDependentVar,
  getPredictionFieldName,
  loadEvalData,
  Eval,
  DataFrameAnalyticsConfig,
} from '../../../../common';
import { ml } from '../../../../../services/ml_api_service';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import { EvaluateStat } from './evaluate_stat';
import {
  getEvalQueryBody,
  isRegressionResultsSearchBoolQuery,
  RegressionResultsSearchQuery,
  SearchQuery,
  ANALYSIS_CONFIG_TYPE,
} from '../../../../common/analytics';

interface Props {
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus: DATA_FRAME_TASK_STATE;
  searchQuery: RegressionResultsSearchQuery;
}

interface TrackTotalHitsSearchResponse {
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: any[];
  };
}

const defaultEval: Eval = { meanSquaredError: '', rSquared: '', error: null };

export const EvaluatePanel: FC<Props> = ({ jobConfig, jobStatus, searchQuery }) => {
  const [trainingEval, setTrainingEval] = useState<Eval>(defaultEval);
  const [generalizationEval, setGeneralizationEval] = useState<Eval>(defaultEval);
  const [isLoadingTraining, setIsLoadingTraining] = useState<boolean>(false);
  const [isLoadingGeneralization, setIsLoadingGeneralization] = useState<boolean>(false);
  const [trainingDocsCount, setTrainingDocsCount] = useState<null | number>(null);
  const [generalizationDocsCount, setGeneralizationDocsCount] = useState<null | number>(null);

  const index = jobConfig.dest.index;
  const dependentVariable = getDependentVar(jobConfig.analysis);
  const predictionFieldName = getPredictionFieldName(jobConfig.analysis);
  // default is 'ml'
  const resultsField = jobConfig.dest.results_field;

  const loadDocsCount = async ({
    ignoreDefaultQuery = true,
    isTraining,
  }: {
    ignoreDefaultQuery?: boolean;
    isTraining: boolean;
  }): Promise<{
    docsCount: number | null;
    success: boolean;
  }> => {
    const query = getEvalQueryBody({ resultsField, isTraining, ignoreDefaultQuery, searchQuery });

    try {
      const body: SearchQuery = {
        track_total_hits: true,
        query,
      };

      const resp: TrackTotalHitsSearchResponse = await ml.esSearch({
        index: jobConfig.dest.index,
        size: 0,
        body,
      });

      const docsCount = resp.hits.total && resp.hits.total.value;
      return { docsCount, success: true };
    } catch (e) {
      return {
        docsCount: null,
        success: false,
      };
    }
  };

  const loadGeneralizationData = async (ignoreDefaultQuery: boolean = true) => {
    setIsLoadingGeneralization(true);

    const genErrorEval = await loadEvalData({
      isTraining: false,
      index,
      dependentVariable,
      resultsField,
      predictionFieldName,
      searchQuery,
      ignoreDefaultQuery,
      jobType: ANALYSIS_CONFIG_TYPE.REGRESSION,
    });

    if (genErrorEval.success === true && genErrorEval.eval) {
      // @ts-ignore
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
  };

  const loadTrainingData = async (ignoreDefaultQuery: boolean = true) => {
    setIsLoadingTraining(true);

    const trainingErrorEval = await loadEvalData({
      isTraining: true,
      index,
      dependentVariable,
      resultsField,
      predictionFieldName,
      searchQuery,
      ignoreDefaultQuery,
      jobType: ANALYSIS_CONFIG_TYPE.REGRESSION,
    });

    if (trainingErrorEval.success === true && trainingErrorEval.eval) {
      // @ts-ignore
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
        error: trainingErrorEval.error,
      });
    }
  };

  const loadData = async ({
    isTrainingClause,
  }: {
    isTrainingClause?: { query: string; operator: string };
  }) => {
    // searchBar query is filtering for testing data
    if (isTrainingClause !== undefined && isTrainingClause.query === 'false') {
      loadGeneralizationData();

      const docsCountResp = await loadDocsCount({ isTraining: false });
      if (docsCountResp.success === true) {
        setGeneralizationDocsCount(docsCountResp.docsCount);
      } else {
        setGeneralizationDocsCount(null);
      }

      setTrainingDocsCount(0);
      setTrainingEval({
        meanSquaredError: '--',
        rSquared: '--',
        error: null,
      });
    } else if (isTrainingClause !== undefined && isTrainingClause.query === 'true') {
      // searchBar query is filtering for training data
      loadTrainingData();

      const docsCountResp = await loadDocsCount({ isTraining: true });
      if (docsCountResp.success === true) {
        setTrainingDocsCount(docsCountResp.docsCount);
      } else {
        setTrainingDocsCount(null);
      }

      setGeneralizationDocsCount(0);
      setGeneralizationEval({
        meanSquaredError: '--',
        rSquared: '--',
        error: null,
      });
    } else {
      // No is_training clause/filter from search bar so load both
      loadGeneralizationData(false);
      const genDocsCountResp = await loadDocsCount({
        ignoreDefaultQuery: false,
        isTraining: false,
      });
      if (genDocsCountResp.success === true) {
        setGeneralizationDocsCount(genDocsCountResp.docsCount);
      } else {
        setGeneralizationDocsCount(null);
      }

      loadTrainingData(false);
      const trainDocsCountResp = await loadDocsCount({
        ignoreDefaultQuery: false,
        isTraining: true,
      });
      if (trainDocsCountResp.success === true) {
        setTrainingDocsCount(trainDocsCountResp.docsCount);
      } else {
        setTrainingDocsCount(null);
      }
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
          <EuiTitle size="xxs">
            <span>
              {i18n.translate(
                'xpack.ml.dataframe.analytics.regressionExploration.generalizationErrorTitle',
                {
                  defaultMessage: 'Generalization error',
                }
              )}
            </span>
          </EuiTitle>
          {generalizationDocsCount !== null && (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.regressionExploration.generalizationDocsCount"
                defaultMessage="{docsCount, plural, one {# doc} other {# docs}} evaluated"
                values={{ docsCount: generalizationDocsCount }}
              />
            </EuiText>
          )}
          <EuiSpacer />
          <EuiFlexGroup>
            {generalizationEval.error !== null && <ErrorCallout error={generalizationEval.error} />}
            {generalizationEval.error === null && (
              <Fragment>
                <EuiFlexItem>
                  <EvaluateStat
                    isLoading={isLoadingGeneralization}
                    title={generalizationEval.meanSquaredError}
                    isMSE
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EvaluateStat
                    isLoading={isLoadingGeneralization}
                    title={generalizationEval.rSquared}
                    isMSE={false}
                  />
                </EuiFlexItem>
              </Fragment>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate(
                'xpack.ml.dataframe.analytics.regressionExploration.trainingErrorTitle',
                {
                  defaultMessage: 'Training error',
                }
              )}
            </span>
          </EuiTitle>
          {trainingDocsCount !== null && (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.regressionExploration.trainingDocsCount"
                defaultMessage="{docsCount, plural, one {# doc} other {# docs}} evaluated"
                values={{ docsCount: trainingDocsCount }}
              />
            </EuiText>
          )}
          <EuiSpacer />
          <EuiFlexGroup>
            {trainingEval.error !== null && <ErrorCallout error={trainingEval.error} />}
            {trainingEval.error === null && (
              <Fragment>
                <EuiFlexItem>
                  <EvaluateStat
                    isLoading={isLoadingTraining}
                    title={trainingEval.meanSquaredError}
                    isMSE
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EvaluateStat
                    isLoading={isLoadingTraining}
                    title={trainingEval.rSquared}
                    isMSE={false}
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
