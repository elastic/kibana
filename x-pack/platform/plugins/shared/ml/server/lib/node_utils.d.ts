import type { IScopedClusterClient } from '@kbn/core/server';
import type { MlNodeCount } from '@kbn/ml-common-types/ml_server_info';
export declare function getMlNodeCount(client: IScopedClusterClient): Promise<MlNodeCount>;
export declare function getLazyMlNodeCount(client: IScopedClusterClient): Promise<number>;
export declare function countJobsLazyStarting(client: IScopedClusterClient, startingJobsCount: number): Promise<{
    availableLazyMlNodes: number;
    currentMlNodeCount: number;
    lazilyStartingJobsCount: number;
    totalStartingJobs: number;
}>;
