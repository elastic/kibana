/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';

import {
  getAnalysisType,
  isRegressionAnalysis,
  isOutlierAnalysis,
  isClassificationAnalysis,
} from '../../../../common/analytics';

import { getResultsUrl, isDataFrameAnalyticsRunning, DataFrameAnalyticsListRow } from './common';
import { stopAnalytics } from '../../services/analytics_service';

import { StartAction } from './action_start';
import { DeleteAction } from './action_delete';

export const AnalyticsViewAction = {
  isPrimary: true,
  render: (item: DataFrameAnalyticsListRow) => {
    const analysisType = getAnalysisType(item.config.analysis);
    const jobStatus = item.stats.state;
    const isDisabled =
      !isRegressionAnalysis(item.config.analysis) &&
      !isOutlierAnalysis(item.config.analysis) &&
      !isClassificationAnalysis(item.config.analysis);

    const url = getResultsUrl(item.id, analysisType, jobStatus);
    return (
      <EuiButtonEmpty
        isDisabled={isDisabled}
        onClick={() => (window.location.href = url)}
        size="xs"
        color="text"
        iconType="visTable"
        aria-label={i18n.translate('xpack.ml.dataframe.analyticsList.viewAriaLabel', {
          defaultMessage: 'View',
        })}
        data-test-sub="mlAnalyticsJobViewButton"
      >
        {i18n.translate('xpack.ml.dataframe.analyticsList.viewActionName', {
          defaultMessage: 'View',
        })}
      </EuiButtonEmpty>
    );
  },
};

export const getActions = () => {
  const canStartStopDataFrameAnalytics: boolean = checkPermission('canStartStopDataFrameAnalytics');

  return [
    AnalyticsViewAction,
    {
      render: (item: DataFrameAnalyticsListRow) => {
        if (!isDataFrameAnalyticsRunning(item.stats.state)) {
          return <StartAction item={item} />;
        }

        const buttonStopText = i18n.translate('xpack.ml.dataframe.analyticsList.stopActionName', {
          defaultMessage: 'Stop',
        });

        const stopButton = (
          <EuiButtonEmpty
            size="xs"
            color="text"
            disabled={!canStartStopDataFrameAnalytics}
            iconType="stop"
            onClick={() => stopAnalytics(item)}
            aria-label={buttonStopText}
            data-test-sub="mlAnalyticsJobStopButton"
          >
            {buttonStopText}
          </EuiButtonEmpty>
        );
        if (!canStartStopDataFrameAnalytics) {
          return (
            <EuiToolTip
              position="top"
              content={createPermissionFailureMessage('canStartStopDataFrameAnalytics')}
            >
              {stopButton}
            </EuiToolTip>
          );
        }

        return stopButton;
      },
    },
    {
      render: (item: DataFrameAnalyticsListRow) => {
        return <DeleteAction item={item} />;
      },
    },
  ];
};
