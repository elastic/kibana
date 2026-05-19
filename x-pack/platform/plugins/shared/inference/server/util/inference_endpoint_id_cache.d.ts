import type { ElasticsearchClient } from '@kbn/core/server';
/**
 * In-memory cache that maintains a Set of known inference endpoint IDs,
 * refreshed periodically via `GET /_inference`. Used to resolve whether
 * a given identifier is a connector or an inference endpoint.
 */
export declare class InferenceEndpointIdCache {
    private knownIds;
    private lastRefresh;
    private refreshPromise;
    private readonly ttlMs;
    private esClient?;
    constructor(options?: {
        ttlMs?: number;
        esClient?: ElasticsearchClient;
    });
    setEsClient(esClient: ElasticsearchClient): void;
    has(id: string): Promise<boolean>;
    updateCacheIfExpired(): Promise<void>;
    invalidate(): void;
    private refresh;
}
