import type { estypes } from '@elastic/elasticsearch';
export type JobId = string;
export type BucketSpan = estypes.Duration;
export type Job = estypes.MlJob;
export type MlJobBlocked = estypes.MlJobBlocked;
export type AnalysisConfig = estypes.MlAnalysisConfig;
export type Detector = estypes.MlDetector;
export type AnalysisLimits = estypes.MlAnalysisLimits;
export type DataDescription = estypes.MlDataDescription;
export type ModelPlotConfig = estypes.MlModelPlotConfig;
export type CustomRule = estypes.MlDetectionRule;
export interface PerPartitionCategorization {
    enabled?: boolean;
    stop_on_warn?: boolean;
}
export type CustomSettings = estypes.MlCustomSettings;
export declare function isAnomalyDetectionJob(arg: unknown): arg is Job;
