/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { pick } from 'lodash';
import type { Moment } from 'moment';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import type { DataView } from '@kbn/data-views-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { LogRateAnalysisReduxProvider } from '@kbn/aiops-log-rate-analysis/state';

import { FilterQueryContextProvider } from '../../../hooks/use_filters_query';
import { timeSeriesDataViewWarning } from '../../../application/utils/time_series_dataview_check';
import { AiopsAppContext, type AiopsAppContextValue } from '../../../hooks/use_aiops_app_context';
import { DataSourceContext } from '../../../hooks/use_data_source';
import { AIOPS_STORAGE_KEYS } from '../../../types/storage';

import type { LogRateAnalysisResultsData } from '../log_rate_analysis_results';

import { LogRateAnalysisDocumentCountChartData } from './log_rate_analysis_document_count_chart_data';
import { LogRateAnalysisContent } from './log_rate_analysis_content';

const localStorage = new Storage(window.localStorage);

/**
 * Props for the LogRateAnalysisContentWrapper component.
 */
export interface LogRateAnalysisContentWrapperProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** App dependencies */
  appContextValue: AiopsAppContextValue;
  /** Timestamp for start of initial analysis */
  initialAnalysisStart?: number | WindowParameters;
  /** Optional time range */
  timeRange?: { min: Moment; max: Moment };
  /** Elasticsearch query to pass to analysis endpoint */
  esSearchQuery?: estypes.QueryDslQueryContainer;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  /**
   * Optional callback that exposes data of the completed analysis
   * @param d Log rate analysis results data
   */
  onAnalysisCompleted?: (d: LogRateAnalysisResultsData) => void;
  /** Optional flag to indicate whether kibana is running in serverless */
  showFrozenDataTierChoice?: boolean;
}

export const LogRateAnalysisContentWrapper: FC<LogRateAnalysisContentWrapperProps> = ({
  dataView,
  appContextValue,
  initialAnalysisStart,
  timeRange,
  esSearchQuery,
  barColorOverride,
  barHighlightColorOverride,
  onAnalysisCompleted,
  showFrozenDataTierChoice = true,
}) => {
  if (!dataView) return null;

  const warning = timeSeriesDataViewWarning(dataView, 'log_rate_analysis');

  if (warning !== null) {
    return <>{warning}</>;
  }

  const datePickerDeps = {
    ...pick(appContextValue, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
    showFrozenDataTierChoice,
  };

  return (
    <AiopsAppContext.Provider value={appContextValue}>
      <UrlStateProvider>
        <DataSourceContext.Provider value={{ dataView, savedSearch: null }}>
          <LogRateAnalysisReduxProvider initialAnalysisStart={initialAnalysisStart}>
            <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>
                <LogRateAnalysisDocumentCountChartData
                  timeRange={timeRange}
                  esSearchQuery={esSearchQuery}
                />
                <FilterQueryContextProvider>
                  <LogRateAnalysisContent
                    esSearchQuery={esSearchQuery}
                    barColorOverride={barColorOverride}
                    barHighlightColorOverride={barHighlightColorOverride}
                    onAnalysisCompleted={onAnalysisCompleted}
                  />
                </FilterQueryContextProvider>
              </DatePickerContextProvider>
            </StorageContextProvider>
          </LogRateAnalysisReduxProvider>
        </DataSourceContext.Provider>
      </UrlStateProvider>
    </AiopsAppContext.Provider>
  );
};
