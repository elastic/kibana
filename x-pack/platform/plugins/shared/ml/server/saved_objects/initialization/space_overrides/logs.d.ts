import type { IScopedClusterClient } from '@kbn/core/server';
export declare function logJobsSpaces({ asInternalUser, }: IScopedClusterClient): Promise<Array<{
    id: string;
    space: string;
}>>;
