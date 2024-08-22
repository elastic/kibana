/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core-http-browser';
import numeral from '@elastic/numeral';
import type { PartialTheme, Theme } from '@elastic/charts';
import React, { useCallback, useMemo, useState } from 'react';

import type { IToasts } from '@kbn/core-notifications-browser';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { Body } from './data_quality_panel/body';
import { DataQualityProvider } from './data_quality_panel/data_quality_context';
import { EMPTY_STAT } from './helpers';
import { ReportDataQualityCheckAllCompleted, ReportDataQualityIndexChecked } from './types';
import { ResultsRollupContext } from './contexts/results_rollup_context';
import { IndicesCheckContext } from './contexts/indices_check_context';
import { useIndicesCheck } from './use_indices_check';
import { useResultsRollup } from './use_results_rollup';
import { ilmPhaseOptionsStatic } from './constants';

interface Props {
  toasts: IToasts;
  baseTheme: Theme;
  canUserCreateAndReadCases: () => boolean;
  defaultNumberFormat: string;
  defaultBytesFormat: string;
  endDate?: string | null;
  httpFetch: HttpHandler;
  isAssistantEnabled: boolean;
  isILMAvailable: boolean;
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
  startDate?: string | null;
  theme?: PartialTheme;
}

const defaultSelectedIlmPhaseOptions: EuiComboBoxOptionOption[] = ilmPhaseOptionsStatic.filter(
  (option) => !option.disabled
);

/** Renders the `Data Quality` dashboard content */
const DataQualityPanelComponent: React.FC<Props> = ({
  toasts,
  baseTheme,
  canUserCreateAndReadCases,
  defaultBytesFormat,
  defaultNumberFormat,
  endDate,
  httpFetch,
  isAssistantEnabled,
  isILMAvailable,
  lastChecked,
  openCreateCaseFlyout,
  patterns,
  reportDataQualityIndexChecked,
  reportDataQualityCheckAllCompleted,
  setLastChecked,
  startDate,
  theme,
}) => {
  const [selectedIlmPhaseOptions, setSelectedIlmPhaseOptions] = useState<EuiComboBoxOptionOption[]>(
    defaultSelectedIlmPhaseOptions
  );
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

  const addSuccessToast = useCallback(
    (toast: { title: string }) => {
      toasts.addSuccess(toast);
    },
    [toasts]
  );
  const ilmPhases: string[] = useMemo(
    () => selectedIlmPhaseOptions.map(({ label }) => label),
    [selectedIlmPhaseOptions]
  );

  const resultsRollupHookReturnValue = useResultsRollup({
    ilmPhases,
    patterns,
    httpFetch,
    toasts,
    isILMAvailable,
    telemetryEvents,
  });

  const indicesCheckHookReturnValue = useIndicesCheck({
    onCheckCompleted: resultsRollupHookReturnValue.onCheckCompleted,
  });

  return (
    <DataQualityProvider
      httpFetch={httpFetch}
      telemetryEvents={telemetryEvents}
      isILMAvailable={isILMAvailable}
      toasts={toasts}
      addSuccessToast={addSuccessToast}
      canUserCreateAndReadCases={canUserCreateAndReadCases}
      endDate={endDate}
      formatBytes={formatBytes}
      formatNumber={formatNumber}
      isAssistantEnabled={isAssistantEnabled}
      lastChecked={lastChecked}
      openCreateCaseFlyout={openCreateCaseFlyout}
      patterns={patterns}
      setLastChecked={setLastChecked}
      startDate={startDate}
      theme={theme}
      baseTheme={baseTheme}
      ilmPhases={ilmPhases}
      selectedIlmPhaseOptions={selectedIlmPhaseOptions}
      setSelectedIlmPhaseOptions={setSelectedIlmPhaseOptions}
    >
      <ResultsRollupContext.Provider value={resultsRollupHookReturnValue}>
        <IndicesCheckContext.Provider value={indicesCheckHookReturnValue}>
          <Body />
        </IndicesCheckContext.Provider>
      </ResultsRollupContext.Provider>
    </DataQualityProvider>
  );
};

DataQualityPanelComponent.displayName = 'DataQualityPanelComponent';

/** Renders the `Data Quality` dashboard content */
export const DataQualityPanel = React.memo(DataQualityPanelComponent);
