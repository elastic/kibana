import type { FC } from 'react';
import type { DataFrameAnalysisConfigType } from '@kbn/ml-data-frame-analytics-utils';
interface Props {
    jobId: string;
    analysisType: DataFrameAnalysisConfigType;
}
export declare const ViewResultsPanel: FC<Props>;
export {};
