import type { FC } from 'react';
import { type DataFrameAnalysisConfigType } from '@kbn/ml-data-frame-analytics-utils';
export declare const PROGRESS_REFRESH_INTERVAL_MS = 1000;
interface Props {
    jobId: string;
    jobType: DataFrameAnalysisConfigType;
    showProgress: boolean;
}
export interface AnalyticsProgressStats {
    currentPhase: number;
    progress: number;
    totalPhases: number;
}
export declare const CreateStepFooter: FC<Props>;
export {};
