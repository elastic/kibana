import type { SavedObjectsResolveResponse, SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { MapAttributes } from '../../../../server';
export interface SharingSavedObjectProps {
    outcome?: SavedObjectsResolveResponse['outcome'];
    aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
    aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
    sourceId?: string;
}
export declare function loadFromLibrary(savedObjectId: string): Promise<{
    attributes: MapAttributes;
    sharingSavedObjectProps: SharingSavedObjectProps;
    managed: boolean;
    references?: SavedObjectReference[];
}>;
