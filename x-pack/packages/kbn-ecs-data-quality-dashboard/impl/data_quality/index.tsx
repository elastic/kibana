/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import type {
  FlameElementEvent,
  HeatmapElementEvent,
  MetricElementEvent,
  PartitionElementEvent,
  Theme,
  WordCloudElementEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import React, { useCallback } from 'react';

import { Body } from './data_quality_panel/body';
import { EMPTY_STAT } from './helpers';

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  defaultNumberFormat: string;
  defaultBytesFormat: string;
  getGroupByFieldsOnClick: (
    elements: Array<
      | FlameElementEvent
      | HeatmapElementEvent
      | MetricElementEvent
      | PartitionElementEvent
      | WordCloudElementEvent
      | XYChartElementEvent
    >
  ) => {
    groupByField0: string;
    groupByField1: string;
  };
  ilmPhases: string[];
  lastChecked: string;
  openCreateCaseFlyout: ({
    comments,
    headerContent,
  }: {
    comments: string[];
    headerContent?: React.ReactNode;
  }) => void;
  patterns: string[];
  setLastChecked: (lastChecked: string) => void;
  theme: Theme;
}

/** Renders the `Data Quality` dashboard content */
const DataQualityPanelComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  defaultBytesFormat,
  defaultNumberFormat,
  getGroupByFieldsOnClick,
  ilmPhases,
  lastChecked,
  openCreateCaseFlyout,
  patterns,
  setLastChecked,
  theme,
}) => {
  const formatBytes = useCallback(
    (value: number | undefined): string =>
      value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT,
    [defaultBytesFormat]
  );

  const formatNumber = useCallback(
    (value: number | undefined): string =>
      value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT,
    [defaultNumberFormat]
  );

  return (
    <Body
      addSuccessToast={addSuccessToast}
      canUserCreateAndReadCases={canUserCreateAndReadCases}
      formatBytes={formatBytes}
      formatNumber={formatNumber}
      getGroupByFieldsOnClick={getGroupByFieldsOnClick}
      ilmPhases={ilmPhases}
      lastChecked={lastChecked}
      openCreateCaseFlyout={openCreateCaseFlyout}
      patterns={patterns}
      setLastChecked={setLastChecked}
      theme={theme}
    />
  );
};

DataQualityPanelComponent.displayName = 'DataQualityPanelComponent';

/** Renders the `Data Quality` dashboard content */
export const DataQualityPanel = React.memo(DataQualityPanelComponent);
