import type { StorageContext } from '@kbn/content-management-plugin/server';
import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { SearchQuery, DeleteResult } from '@kbn/content-management-plugin/common';
import type { MapItem, MapsSearchOut } from '../../common/content_management';
import type { MapsGetOut, MapsSearchOptions, MapsCreateOptions, MapsCreateOut, MapsUpdateOptions, MapsUpdateOut } from './schema/v1/types';
import type { MapAttributes } from './schema/v1/map_attributes_schema';
import type { StoredMapAttributes } from '../saved_objects/types';
export declare class MapsStorage {
    get(ctx: StorageContext, id: string): Promise<MapsGetOut>;
    bulkGet(): Promise<never>;
    create(ctx: StorageContext, data: MapAttributes, options: MapsCreateOptions): Promise<MapsCreateOut>;
    update(ctx: StorageContext, id: string, data: MapAttributes, options: MapsUpdateOptions): Promise<MapsUpdateOut>;
    delete(ctx: StorageContext, id: string, options?: {
        force: boolean;
    }): Promise<DeleteResult>;
    search(ctx: StorageContext, query: SearchQuery, options: MapsSearchOptions): Promise<MapsSearchOut>;
    mSearch: {
        savedObjectType: string;
        toItemResult: (ctx: StorageContext, savedObject: SavedObject<StoredMapAttributes>) => MapItem;
    };
}
