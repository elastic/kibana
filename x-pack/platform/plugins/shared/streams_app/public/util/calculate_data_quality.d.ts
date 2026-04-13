import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
export declare function calculateDataQuality({ totalDocs, degradedDocs, failedDocs, }: {
    totalDocs: number;
    degradedDocs: number;
    failedDocs: number;
}): QualityIndicators;
