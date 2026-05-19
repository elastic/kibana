import type { IScopedClusterClient } from '@kbn/core/server';
export declare function metricsJobsSpaces({ asInternalUser, }: IScopedClusterClient): Promise<Array<{
    id: string;
    space: string;
}>>;
