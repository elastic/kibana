import { type FC } from 'react';
import { type DocumentCountChartProps } from './document_count_chart';
type DocumentCountChartReduxProps = Omit<DocumentCountChartProps, 'chartPointsSplitLabel' | 'autoAnalysisStart' | 'chartPoints' | 'chartPointsSplit' | 'documentStats' | 'isBrushCleared' | 'brushSelectionUpdateHandler' | 'timeRangeEarliest' | 'timeRangeLatest' | 'interval'>;
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
export declare const DocumentCountChartRedux: FC<DocumentCountChartReduxProps>;
export {};
