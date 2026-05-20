import type { IScopedClusterClient } from '@kbn/core/server';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { MlClient } from '../../lib/ml_client';
export declare function validateModelMemoryLimit(client: IScopedClusterClient, mlClient: MlClient, job: CombinedJob, duration?: {
    start?: number;
    end?: number;
}): Promise<({
    id: string;
    maxModelMemoryLimit: string;
    modelMemoryLimit: string;
    mml?: undefined;
    effectiveMaxModelMemoryLimit?: undefined;
} | {
    id: string;
    mml: string;
    maxModelMemoryLimit?: undefined;
    modelMemoryLimit?: undefined;
    effectiveMaxModelMemoryLimit?: undefined;
} | {
    id: string;
    maxModelMemoryLimit: string | undefined;
    mml: string;
    modelMemoryLimit?: undefined;
    effectiveMaxModelMemoryLimit?: undefined;
} | {
    id: string;
    maxModelMemoryLimit: string | undefined;
    mml: string;
    effectiveMaxModelMemoryLimit: string;
    modelMemoryLimit?: undefined;
} | {
    id: string;
    maxModelMemoryLimit?: undefined;
    modelMemoryLimit?: undefined;
    mml?: undefined;
    effectiveMaxModelMemoryLimit?: undefined;
})[]>;
