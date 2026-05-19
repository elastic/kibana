import type { SavedObjectReference } from '@kbn/core/public';
import type { MapAttributes } from '../../../../server';
export declare function saveToLibrary(attributes: MapAttributes, references: SavedObjectReference[], savedObjectId?: string): Promise<{
    id: string;
}>;
