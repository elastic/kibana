import type { IScopedClusterClient, SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
export type GetDataViewsService = () => Promise<DataViewsService>;
export declare function getDataViewsServiceFactory(getDataViews: () => DataViewsPluginStart | null, savedObjectClient: SavedObjectsClientContract, scopedClient: IScopedClusterClient, request: KibanaRequest): GetDataViewsService;
