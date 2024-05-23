/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import {
  brushSelectionUpdate,
  setAutoRunAnalysis,
  useAppSelector,
  useAppDispatch,
} from '@kbn/aiops-log-rate-analysis/state';

import { DocumentCountChart, type DocumentCountChartProps } from './document_count_chart';

type DocumentCountChartReduxProps = Omit<
  DocumentCountChartProps,
  'autoAnalysisStart' | 'isBrushCleared' | 'brushSelectionUpdateHandler'
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
export const DocumentCountChartRedux: FC<DocumentCountChartReduxProps> = (props) => {
  const dispatch = useAppDispatch();
  const initialAnalysisStart = useAppSelector((s) => s.logRateAnalysis.initialAnalysisStart);
  const isBrushCleared = useAppSelector((s) => s.logRateAnalysis.isBrushCleared);

  return (
    <DocumentCountChart
      {...props}
      autoAnalysisStart={initialAnalysisStart}
      brushSelectionUpdateHandler={(d) => dispatch(brushSelectionUpdate(d))}
      isBrushCleared={isBrushCleared}
      setAutoRunAnalysisFn={(d: boolean) => dispatch(setAutoRunAnalysis(d))}
    />
  );
};
