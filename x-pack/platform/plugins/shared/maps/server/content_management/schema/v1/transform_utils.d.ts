import type { SavedObject, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { MapItem } from '../../../../common/content_management';
import type { MapAttributes } from './map_attributes_schema';
import type { StoredMapAttributes } from '../../../saved_objects/types';
type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
    references: SavedObjectReference[] | undefined;
};
interface PartialMapsItem {
    attributes: Partial<MapAttributes>;
    references: SavedObjectReference[] | undefined;
}
export declare function savedObjectToItem(savedObject: SavedObject<StoredMapAttributes>, partial: false): MapItem;
export declare function savedObjectToItem(savedObject: PartialSavedObject<StoredMapAttributes>, partial: true): PartialMapsItem;
export {};
