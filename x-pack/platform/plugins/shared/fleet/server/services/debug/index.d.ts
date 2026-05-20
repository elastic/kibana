import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
export declare function isIndexAllowedForDebug(index: string): boolean;
export declare function isSavedObjectTypeAllowedForDebug(type: string): boolean;
export type DebugResult<T> = {
    ok: true;
    body: T;
} | {
    ok: false;
    body: {
        message: string;
    };
};
export declare function fetchIndex(esClient: ElasticsearchClient, index: string): Promise<DebugResult<Awaited<ReturnType<ElasticsearchClient['search']>>>>;
export declare function fetchSavedObjects(soClient: SavedObjectsClientContract, type: string, name: string): Promise<DebugResult<Awaited<ReturnType<SavedObjectsClientContract['find']>>>>;
export declare function fetchSavedObjectNames(soClient: SavedObjectsClientContract, type: string): Promise<DebugResult<Awaited<ReturnType<SavedObjectsClientContract['find']>>>>;
