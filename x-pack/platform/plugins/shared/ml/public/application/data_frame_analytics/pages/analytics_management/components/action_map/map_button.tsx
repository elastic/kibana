/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

import {
  isRegressionAnalysis,
  isOutlierAnalysis,
  isClassificationAnalysis,
} from '@kbn/ml-data-frame-analytics-utils';

import type { DataFrameAnalyticsListRow } from '../analytics_list/common';

export const mapActionButtonText = i18n.translate(
  'xpack.ml.dataframe.analyticsList.mapActionName',
  {
    defaultMessage: 'Map',
  }
);
interface MapButtonProps {
  item: DataFrameAnalyticsListRow;
}

export const MapButton: FC<MapButtonProps> = ({ item }) => {
  const disabled =
    !isRegressionAnalysis(item.config.analysis) &&
    !isOutlierAnalysis(item.config.analysis) &&
    !isClassificationAnalysis(item.config.analysis);

  if (disabled) {
    const toolTipContent = i18n.translate(
      'xpack.ml.dataframe.analyticsList.mapActionDisabledTooltipContent',
      {
        defaultMessage: 'Unknown analysis type.',
      }
    );

    return (
      <EuiToolTip position="top" content={toolTipContent}>
        <>{mapActionButtonText}</>
      </EuiToolTip>
    );
  }

  return <>{mapActionButtonText}</>;
};
