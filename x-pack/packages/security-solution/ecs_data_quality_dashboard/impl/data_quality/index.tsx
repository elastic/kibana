/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core-http-browser';
import numeral from '@elastic/numeral';
import type {
  FlameElementEvent,
  HeatmapElementEvent,
  MetricElementEvent,
  PartialTheme,
  PartitionElementEvent,
  Theme,
  WordCloudElementEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import React, { useCallback, useMemo } from 'react';

import { Body } from './data_quality_panel/body';
import { DataQualityProvider } from './data_quality_panel/data_quality_context';
import { EMPTY_STAT } from './helpers';
import { ReportDataQualityCheckAllCompleted, ReportDataQualityIndexChecked } from './types';

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
  httpFetch: HttpHandler;
  ilmPhases: string[];
  isAssistantEnabled: boolean;
  lastChecked: string;
  openCreateCaseFlyout: ({
    comments,
    headerContent,
  }: {
    comments: string[];
    headerContent?: React.ReactNode;
  }) => void;
  patterns: string[];
  reportDataQualityIndexChecked?: ReportDataQualityIndexChecked;
  reportDataQualityCheckAllCompleted?: ReportDataQualityCheckAllCompleted;
  setLastChecked: (lastChecked: string) => void;
  theme?: PartialTheme;
  baseTheme: Theme;
}

/** Renders the `Data Quality` dashboard content */
const DataQualityPanelComponent: React.FC<Props> = ({
  addSuccessToast,
  baseTheme,
  canUserCreateAndReadCases,
  defaultBytesFormat,
  defaultNumberFormat,
  getGroupByFieldsOnClick,
  httpFetch,
  ilmPhases,
  isAssistantEnabled,
  lastChecked,
  openCreateCaseFlyout,
  patterns,
  reportDataQualityIndexChecked,
  reportDataQualityCheckAllCompleted,
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

  const telemetryEvents = useMemo(
    () => ({ reportDataQualityCheckAllCompleted, reportDataQualityIndexChecked }),
    [reportDataQualityCheckAllCompleted, reportDataQualityIndexChecked]
  );

  return (
    <DataQualityProvider httpFetch={httpFetch} telemetryEvents={telemetryEvents}>
      <Body
        addSuccessToast={addSuccessToast}
        canUserCreateAndReadCases={canUserCreateAndReadCases}
        formatBytes={formatBytes}
        formatNumber={formatNumber}
        getGroupByFieldsOnClick={getGroupByFieldsOnClick}
        ilmPhases={ilmPhases}
        isAssistantEnabled={isAssistantEnabled}
        lastChecked={lastChecked}
        openCreateCaseFlyout={openCreateCaseFlyout}
        patterns={patterns}
        setLastChecked={setLastChecked}
        theme={theme}
        baseTheme={baseTheme}
      />
    </DataQualityProvider>
  );
};

DataQualityPanelComponent.displayName = 'DataQualityPanelComponent';

/** Renders the `Data Quality` dashboard content */
export const DataQualityPanel = React.memo(DataQualityPanelComponent);
