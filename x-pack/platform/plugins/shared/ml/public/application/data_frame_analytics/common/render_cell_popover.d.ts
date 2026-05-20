import React from 'react';
import type { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import { type DataFrameAnalysisConfigType, type FeatureImportanceBaseline } from '@kbn/ml-data-frame-analytics-utils';
import { type DataGridItem, type IndexPagination } from '@kbn/ml-data-grid';
interface RenderCellPopoverFactoryOptions {
    analysisType?: DataFrameAnalysisConfigType | 'unknown';
    baseline?: FeatureImportanceBaseline;
    data: DataGridItem[];
    pagination: IndexPagination;
    predictionFieldName?: string;
    resultsField?: string;
}
export declare const renderCellPopoverFactory: ({ analysisType, baseline, data, pagination, predictionFieldName, resultsField, }: RenderCellPopoverFactoryOptions) => (popoverProps: EuiDataGridCellPopoverElementProps) => React.JSX.Element;
export {};
