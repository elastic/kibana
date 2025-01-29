/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { formatNumber } from '@elastic/eui';

import { useSummaryPanelContext } from '../../../hooks';
import { BYTE_NUMBER_FORMAT } from '../../../../common/constants';
import {
  summaryPanelEstimatedDataText,
  summaryPanelEstimatedDataTooltipText,
} from '../../../../common/translations';
import { DataPlaceholder } from './data_placeholder';

export function EstimatedData() {
  const { estimatedData, isEstimatedDataLoading, isUserAuthorizedForDataset } =
    useSummaryPanelContext();

  return (
    <DataPlaceholder
      title={summaryPanelEstimatedDataText}
      tooltip={summaryPanelEstimatedDataTooltipText}
      value={formatNumber(estimatedData, BYTE_NUMBER_FORMAT)}
      isLoading={isEstimatedDataLoading}
      isUserAuthorizedForDataset={isUserAuthorizedForDataset}
    />
  );
}
