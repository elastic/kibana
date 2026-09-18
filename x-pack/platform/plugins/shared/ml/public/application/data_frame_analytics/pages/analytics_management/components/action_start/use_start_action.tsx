/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { createPermissionFailureMessage } from '../../../../../capabilities/check_capabilities';
import type {
  DataFrameAnalyticsListAction,
  DataFrameAnalyticsListRow,
} from '../analytics_list/common';
import {
  isCompletedAnalyticsJob,
  isDataFrameAnalyticsFailed,
  isDataFrameAnalyticsRunning,
} from '../analytics_list/common';
import { useStartAnalytics } from '../../services/analytics_service';

export const startActionNameText = i18n.translate(
  'xpack.ml.dataframe.analyticsList.startActionNameText',
  {
    defaultMessage: 'Start',
  }
);

export type StartAction = ReturnType<typeof useStartAction>;
export const useStartAction = (canStartStopDataFrameAnalytics: boolean) => {
  const [isModalVisible, setModalVisible] = useState(false);

  const [item, setItem] = useState<DataFrameAnalyticsListRow>();

  const startAnalytics = useStartAnalytics();

  const closeModal = () => setModalVisible(false);
  const startAndCloseModal = () => {
    if (item !== undefined) {
      setModalVisible(false);
      startAnalytics(item);
    }
  };

  const openModal = (newItem: DataFrameAnalyticsListRow) => {
    setItem(newItem);
    setModalVisible(true);
  };

  const startButtonEnabled = (i: DataFrameAnalyticsListRow) => {
    if (!isDataFrameAnalyticsRunning(i.stats.state)) {
      // Disable start for analytics jobs which have completed.
      const completeAnalytics = isCompletedAnalyticsJob(i.stats);
      return canStartStopDataFrameAnalytics && !completeAnalytics;
    }
    return canStartStopDataFrameAnalytics;
  };

  const action: DataFrameAnalyticsListAction = useMemo(
    () => ({
      name: startActionNameText,
      available: (i: DataFrameAnalyticsListRow) =>
        !isDataFrameAnalyticsRunning(i.stats.state) && !isDataFrameAnalyticsFailed(i.stats.state),
      enabled: startButtonEnabled,
      description: (i: DataFrameAnalyticsListRow) => {
        if (startButtonEnabled(i)) {
          return startActionNameText;
        }

        return !canStartStopDataFrameAnalytics
          ? createPermissionFailureMessage('canStartStopDataFrameAnalytics')
          : i18n.translate('xpack.ml.dataframe.analyticsList.completeBatchAnalyticsToolTip', {
              defaultMessage: '{analyticsId} is a completed analytics job and cannot be restarted.',
              values: { analyticsId: i.config.id },
            });
      },
      icon: 'play',
      type: 'icon',
      onClick: openModal,
      'data-test-subj': 'mlAnalyticsJobStartButton',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return {
    action,
    closeModal,
    isModalVisible,
    item,
    openModal,
    startAndCloseModal,
  };
};
