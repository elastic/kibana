import type { IScopedClusterClient, KibanaResponseFactory, Logger } from '@kbn/core/server';
export declare function getMatchingIndexes(indexPattern: string, { asCurrentUser }: IScopedClusterClient, response: KibanaResponseFactory, logger: Logger): Promise<import("@kbn/core/server").IKibanaResponse<any>>;
