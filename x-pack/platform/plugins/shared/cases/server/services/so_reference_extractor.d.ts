import type { SavedObject, SavedObjectReference, SavedObjectsUpdateResponse } from '@kbn/core/server';
interface Field {
    path: string;
    type: string;
    name: string;
}
/**
 * This class handles remove fields from an object and moving them into the saved object reference fields. It also
 * handles going the opposite direction to add fields back into an object by setting them to null or if a reference is
 * found setting them to the value defined in the reference.
 *
 * This population of the field is to avoid having to change the UI to look in the references field of saved objects
 * to find these values.
 */
export declare class SOReferenceExtractor {
    private readonly fieldsToExtract;
    constructor(fieldsToExtract: Field[]);
    extractFieldsToReferences<T>({ data, existingReferences, }: {
        data: unknown;
        existingReferences?: SavedObjectReference[];
    }): {
        transformedFields: T;
        references: SavedObjectReference[];
        didDeleteOperation: boolean;
    };
    populateFieldsFromReferences<T extends object>(data: SavedObject<object>): SavedObject<T>;
    populateFieldsFromReferencesForPatch<T extends object>({ dataBeforeRequest, dataReturnedFromRequest, }: {
        dataBeforeRequest: object;
        dataReturnedFromRequest: SavedObjectsUpdateResponse<object>;
    }): SavedObjectsUpdateResponse<T>;
}
export {};
