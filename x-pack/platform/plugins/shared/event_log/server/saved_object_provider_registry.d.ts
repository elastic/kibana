import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
export type SavedObjectGetter = (...params: Parameters<SavedObjectsClientContract['get']>) => Promise<unknown>;
export type SavedObjectBulkGetter = (...params: Parameters<SavedObjectsClientContract['bulkGet']>) => Promise<unknown>;
export type SavedObjectBulkGetterResult = (type: string, ids: string[]) => Promise<unknown>;
export type SavedObjectProvider = (request: KibanaRequest, spaceId?: string) => SavedObjectBulkGetter;
export declare class SavedObjectProviderRegistry {
    private providers;
    private defaultProvider?;
    constructor();
    registerDefaultProvider(provider: SavedObjectProvider): void;
    registerProvider(type: string, provider: SavedObjectProvider): void;
    getProvidersClient(request: KibanaRequest): SavedObjectBulkGetterResult;
    getProvidersClientWithRequestInSpace(request: KibanaRequest, spaceId: string): SavedObjectBulkGetterResult;
    private createProvidersClient;
}
