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

import { isOutlierAnalysis } from '../../../../common/analytics';

import { getResultsUrl, isDataFrameAnalyticsRunning, DataFrameAnalyticsListRow } from './common';
import { stopAnalytics } from '../../services/analytics_service';

import { StartAction } from './action_start';
import { DeleteAction } from './action_delete';

export const getActions = () => {
  const canStartStopDataFrameAnalytics: boolean = checkPermission('canStartStopDataFrameAnalytics');

  return [
    {
      isPrimary: true,
      render: (item: DataFrameAnalyticsListRow) => {
        return (
          <EuiButtonEmpty
            disabled={!isOutlierAnalysis(item.config.analysis)}
            onClick={() => (window.location.href = getResultsUrl(item.id))}
            size="xs"
            color="text"
            iconType="visTable"
            aria-label={i18n.translate('xpack.ml.dataframe.analyticsList.viewAriaLabel', {
              defaultMessage: 'View',
            })}
          >
            {i18n.translate('xpack.ml.dataframe.analyticsList.viewActionName', {
              defaultMessage: 'View',
            })}
          </EuiButtonEmpty>
        );
      },
    },
    {
      render: (item: DataFrameAnalyticsListRow) => {
        if (!isDataFrameAnalyticsRunning(item.stats)) {
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
