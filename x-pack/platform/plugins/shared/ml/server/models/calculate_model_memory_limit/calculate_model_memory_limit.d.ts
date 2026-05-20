import type { IScopedClusterClient } from '@kbn/core/server';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { AnalysisConfig } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlClient } from '../../lib/ml_client';
export interface ModelMemoryEstimationResult {
    /**
     * Result model memory limit
     */
    modelMemoryLimit: string;
    /**
     * Estimated model memory by elasticsearch ml endpoint
     */
    estimatedModelMemoryLimit: string;
    /**
     * Maximum model memory limit
     */
    maxModelMemoryLimit?: string;
}
/**
 * Response of the _estimate_model_memory endpoint.
 */
export interface ModelMemoryEstimateResponse {
    model_memory_estimate: string;
}
export declare function calculateModelMemoryLimitProvider(client: IScopedClusterClient, mlClient: MlClient): (analysisConfig: AnalysisConfig, indexPattern: string, query: any, timeFieldName: string, earliestMs: number, latestMs: number, allowMMLGreaterThanMax?: boolean, datafeedConfig?: Datafeed) => Promise<ModelMemoryEstimationResult>;
