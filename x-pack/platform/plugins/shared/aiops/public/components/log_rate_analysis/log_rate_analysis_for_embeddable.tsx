/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, type FC } from 'react';

import type { TimeRange } from '@kbn/es-query';
import type { RequestCancellationManager } from '@kbn/presentation-publishing';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-service';
import { useAppSelector } from '@kbn/aiops-log-rate-analysis/state';

import { calculateBounds } from '@kbn/data-plugin/common';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useFilterQueryUpdates } from '../../hooks/use_filters_query';
import { useSearch } from '../../hooks/use_search';
import { useDataSource } from '../../hooks/use_data_source';
import { getDefaultLogRateAnalysisAppState } from '../../application/url_state/log_rate_analysis';

import { LogRateAnalysisDocumentCountChartData } from './log_rate_analysis_content/log_rate_analysis_document_count_chart_data';
import { LogRateAnalysisContent } from './log_rate_analysis_content/log_rate_analysis_content';

export interface LogRateAnalysisForEmbeddableProps {
  timeRange: TimeRange;
  /** Reports whether the document count stats or the analysis stream are loading */
  onLoading?: (isLoading: boolean) => void;
  /** Called once neither the document count stats nor the analysis stream are loading */
  onRenderComplete?: () => void;
  /** Optional manager used by dashboard panels to cancel in-flight and pending requests */
  requestCancellationManager?: RequestCancellationManager;
  /** Dashboard Refresh timestamp. Changes only when the user refreshes. */
  lastReloadRequestTime?: number;
  parentApi: unknown;
}

export const LogRateAnalysisForEmbeddable: FC<LogRateAnalysisForEmbeddableProps> = ({
  timeRange,
  onLoading,
  onRenderComplete,
  requestCancellationManager,
  lastReloadRequestTime,
  parentApi,
}) => {
  const { uiSettings } = useAiopsAppContext();
  const { dataView } = useDataSource();
  const { filters, query } = useFilterQueryUpdates();
  const appState = getDefaultLogRateAnalysisAppState({
    searchQuery: buildEsQuery(
      dataView,
      query ?? [],
      filters ?? [],
      uiSettings ? getEsQueryConfig(uiSettings) : undefined
    ),
    filters,
  });
  const { searchQuery } = useSearch({ dataView, savedSearch: null }, appState, true);

  const isStreamRunning = useAppSelector((s) => s.stream.isRunning);
  // Tracks the active document count request, previous results are retained while refetching.
  const [isDocumentCountLoading, setIsDocumentCountLoading] = useState(true);
  const isLoading = isStreamRunning || isDocumentCountLoading;

  useEffect(
    function reportLoadingState() {
      onLoading?.(isLoading);
      if (!isLoading) {
        onRenderComplete?.();
      }
    },
    [isLoading, onLoading, onRenderComplete]
  );

  const timeRangeParsed = useMemo(() => {
    if (timeRange) {
      const bounds = calculateBounds(timeRange);
      if (bounds.min && bounds.max) {
        return { min: bounds.min, max: bounds.max };
      }
    }
  }, [timeRange]);

  return (
    <>
      <LogRateAnalysisDocumentCountChartData
        timeRange={timeRangeParsed}
        esSearchQuery={searchQuery}
        requestCancellationManager={requestCancellationManager}
        onLoadingChange={setIsDocumentCountLoading}
      />
      <LogRateAnalysisContent
        esSearchQuery={searchQuery}
        requestCancellationManager={requestCancellationManager}
        lastReloadRequestTime={lastReloadRequestTime}
        parentApi={parentApi}
      />
    </>
  );
};
