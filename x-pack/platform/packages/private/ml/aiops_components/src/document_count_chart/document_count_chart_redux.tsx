/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type FC } from 'react';

import { i18n } from '@kbn/i18n';
import type { LogRateHistogramItem } from '@kbn/aiops-log-rate-analysis';
import {
  brushSelectionUpdate,
  setAutoRunAnalysis,
  useAppSelector,
  useAppDispatch,
  useCurrentSelectedGroup,
  useCurrentSelectedSignificantItem,
  type GroupTableItem,
} from '@kbn/aiops-log-rate-analysis/state';
import type { SignificantItem } from '@kbn/ml-agg-utils';

import { DocumentCountChart, type DocumentCountChartProps } from './document_count_chart';

function getDocumentCountStatsSplitLabel(
  significantItem?: SignificantItem,
  group?: GroupTableItem
): string {
  if (significantItem) {
    return `${significantItem?.fieldName}:${significantItem?.fieldValue}`;
  } else if (group) {
    return i18n.translate('xpack.aiops.logRateAnalysis.page.documentCountStatsSplitGroupLabel', {
      defaultMessage: 'Selected group',
    });
  } else {
    return '';
  }
}

type DocumentCountChartReduxProps = Omit<
  DocumentCountChartProps,
  | 'chartPointsSplitLabel'
  | 'autoAnalysisStart'
  | 'chartPoints'
  | 'chartPointsSplit'
  | 'documentStats'
  | 'isBrushCleared'
  | 'brushSelectionUpdateHandler'
  | 'timeRangeEarliest'
  | 'timeRangeLatest'
  | 'interval'
>;

/**
 * Functional component that renders a `DocumentCountChart` with additional properties
 * managed by the log rate analysis state. It leverages the `LogRateAnalysisReduxProvider`
 * to acquire state variables like `initialAnalysisStart` and functions such as
 * `setAutoRunAnalysis`. These values are then passed as props to the `DocumentCountChart`.
 * This wrapper component is necessary since the `DocumentCountChart` component is
 * also used for log pattern analysis which doesn't use redux.
 *
 * @param props - The properties passed to the DocumentCountChart component.
 * @returns The DocumentCountChart component enhanced with automatic analysis start capabilities.
 */
export const DocumentCountChartRedux: FC<DocumentCountChartReduxProps> = memo((props) => {
  const dispatch = useAppDispatch();
  const currentSelectedGroup = useCurrentSelectedGroup();
  const currentSelectedSignificantItem = useCurrentSelectedSignificantItem();
  const { documentStats, initialAnalysisStart, isBrushCleared } = useAppSelector(
    (s) => s.logRateAnalysis
  );
  const { documentCountStats, documentCountStatsCompare } = documentStats;

  const bucketTimestamps = Object.keys(documentCountStats?.buckets ?? {}).map((time) => +time);
  const splitBucketTimestamps = Object.keys(documentCountStatsCompare?.buckets ?? {}).map(
    (time) => +time
  );
  const timeRangeEarliest = Math.min(...[...bucketTimestamps, ...splitBucketTimestamps]);
  const timeRangeLatest = Math.max(...[...bucketTimestamps, ...splitBucketTimestamps]);

  if (
    documentCountStats === undefined ||
    documentCountStats.buckets === undefined ||
    documentCountStats.interval === undefined ||
    timeRangeEarliest === undefined ||
    timeRangeLatest === undefined
  ) {
    return null;
  }

  const documentCountStatsSplitLabel = getDocumentCountStatsSplitLabel(
    currentSelectedSignificantItem,
    currentSelectedGroup
  );

  const chartPoints: LogRateHistogramItem[] = Object.entries(documentCountStats.buckets).map(
    ([time, value]) => ({
      time: +time,
      value,
    })
  );

  let chartPointsSplit: LogRateHistogramItem[] | undefined;
  if (documentCountStatsCompare?.buckets !== undefined) {
    chartPointsSplit = Object.entries(documentCountStatsCompare?.buckets).map(([time, value]) => ({
      time: +time,
      value,
    }));
  }

  return (
    <DocumentCountChart
      {...props}
      chartPointsSplitLabel={documentCountStatsSplitLabel}
      timeRangeEarliest={timeRangeEarliest}
      timeRangeLatest={timeRangeLatest}
      interval={documentCountStats.interval}
      chartPoints={chartPoints}
      chartPointsSplit={chartPointsSplit}
      autoAnalysisStart={initialAnalysisStart}
      brushSelectionUpdateHandler={(d) => dispatch(brushSelectionUpdate(d))}
      isBrushCleared={isBrushCleared}
      setAutoRunAnalysisFn={(d: boolean) => dispatch(setAutoRunAnalysis(d))}
    />
  );
});
