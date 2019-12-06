/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import moment from 'moment-timezone';

import { EuiIcon, EuiLoadingSpinner, EuiTabbedContent } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { formatHumanReadableDateTimeSeconds } from '../../../../../util/date_utils';

import { DataFrameAnalyticsListRow } from './common';
import { ExpandedRowDetailsPane, SectionConfig } from './expanded_row_details_pane';
import { ExpandedRowJsonPane } from './expanded_row_json_pane';
import { ProgressBar } from './progress_bar';
import {
  getDependentVar,
  getPredictionFieldName,
  getValuesFromResponse,
  loadEvalData,
  Eval,
} from '../../../../common';
import { isCompletedAnalyticsJob } from './common';
import { isRegressionAnalysis } from '../../../../common/analytics';
import { ExpandedRowMessagesPane } from './expanded_row_messages_pane';

function getItemDescription(value: any) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value.toString();
}

interface LoadedStatProps {
  isLoading: boolean;
  evalData: Eval;
  resultProperty: 'meanSquaredError' | 'rSquared';
}

const LoadedStat: FC<LoadedStatProps> = ({ isLoading, evalData, resultProperty }) => {
  return (
    <Fragment>
      {isLoading === false && evalData.error !== null && <EuiIcon type="alert" size="s" />}
      {isLoading === true && <EuiLoadingSpinner size="s" />}
      {isLoading === false && evalData.error === null && evalData[resultProperty]}
    </Fragment>
  );
};

interface Props {
  item: DataFrameAnalyticsListRow;
}

const defaultEval: Eval = { meanSquaredError: '', rSquared: '', error: null };

export const ExpandedRow: FC<Props> = ({ item }) => {
  const [trainingEval, setTrainingEval] = useState<Eval>(defaultEval);
  const [generalizationEval, setGeneralizationEval] = useState<Eval>(defaultEval);
  const [isLoadingTraining, setIsLoadingTraining] = useState<boolean>(false);
  const [isLoadingGeneralization, setIsLoadingGeneralization] = useState<boolean>(false);
  const index = item?.config?.dest?.index;
  const dependentVariable = getDependentVar(item.config.analysis);
  const predictionFieldName = getPredictionFieldName(item.config.analysis);
  // default is 'ml'
  const resultsField = item.config.dest.results_field;
  const jobIsCompleted = isCompletedAnalyticsJob(item.stats);
  const isRegressionJob = isRegressionAnalysis(item.config.analysis);

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
    if (jobIsCompleted && isRegressionJob) {
      loadData();
    }
  }, [jobIsCompleted]);

  const stateValues: any = { ...item.stats };

  if (item.config?.description) {
    stateValues.description = item.config.description;
  }
  delete stateValues.progress;

  const state: SectionConfig = {
    title: i18n.translate('xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.state', {
      defaultMessage: 'State',
    }),
    items: Object.entries(stateValues).map(s => {
      return { title: s[0].toString(), description: getItemDescription(s[1]) };
    }),
    position: 'left',
  };

  const progress: SectionConfig = {
    title: i18n.translate(
      'xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.progress',
      { defaultMessage: 'Progress' }
    ),
    items: item.stats.progress.map(s => {
      return {
        title: s.phase,
        description: <ProgressBar progress={s.progress_percent} />,
      };
    }),
    position: 'left',
  };

  const stats: SectionConfig = {
    title: i18n.translate('xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettings.stats', {
      defaultMessage: 'Stats',
    }),
    items: [
      {
        title: 'create_time',
        description: formatHumanReadableDateTimeSeconds(
          moment(item.config.create_time).unix() * 1000
        ),
      },
      { title: 'model_memory_limit', description: item.config.model_memory_limit },
      { title: 'version', description: item.config.version },
    ],
    position: 'right',
  };

  if (jobIsCompleted && isRegressionJob) {
    stats.items.push(
      {
        title: 'generalization mean squared error',
        description: (
          <LoadedStat
            isLoading={isLoadingGeneralization}
            evalData={generalizationEval}
            resultProperty={'meanSquaredError'}
          />
        ),
      },
      {
        title: 'generalization r squared',
        description: (
          <LoadedStat
            isLoading={isLoadingGeneralization}
            evalData={generalizationEval}
            resultProperty={'rSquared'}
          />
        ),
      },
      {
        title: 'training mean squared error',
        description: (
          <LoadedStat
            isLoading={isLoadingTraining}
            evalData={trainingEval}
            resultProperty={'meanSquaredError'}
          />
        ),
      },
      {
        title: 'training r squared',
        description: (
          <LoadedStat
            isLoading={isLoadingTraining}
            evalData={trainingEval}
            resultProperty={'rSquared'}
          />
        ),
      }
    );
  }

  const tabs = [
    {
      id: 'ml-analytics-job-details',
      name: i18n.translate('xpack.ml.dataframe.analyticsList.expandedRow.tabs.jobSettingsLabel', {
        defaultMessage: 'Job details',
      }),
      content: <ExpandedRowDetailsPane sections={[state, progress, stats]} />,
    },
    {
      id: 'ml-analytics-job-json',
      name: 'JSON',
      content: <ExpandedRowJsonPane json={item.config} />,
    },
    {
      id: 'ml-analytics-job-messages',
      name: i18n.translate(
        'xpack.ml.dataframe.analyticsList.analyticsDetails.tabs.analyticsMessagesLabel',
        {
          defaultMessage: 'Job messages',
        }
      ),
      content: <ExpandedRowMessagesPane analyticsId={item.id} />,
    },
  ];

  // Using `expand=false` here so the tabs themselves don't spread
  // across the full width. The 100% width is used so the bottom line
  // as well as the tab content spans across the full width.
  // EuiTabbedContent would do that usually anyway,
  // it just doesn't seem to work within certain layouts.
  return (
    <EuiTabbedContent
      size="s"
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      onTabClick={() => {}}
      expand={false}
      style={{ width: '100%' }}
    />
  );
};
