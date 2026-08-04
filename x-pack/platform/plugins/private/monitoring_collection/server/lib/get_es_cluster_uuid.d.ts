import type { IScopedClusterClient } from '@kbn/core/server';
export declare function getESClusterUuid(client: IScopedClusterClient): Promise<string>;
