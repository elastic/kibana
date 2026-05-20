import type { IScopedClusterClient } from '@kbn/core/server';
import type { JobSpaceOverrides } from '../../sync';
export declare function createJobSpaceOverrides(clusterClient: IScopedClusterClient): Promise<JobSpaceOverrides>;
