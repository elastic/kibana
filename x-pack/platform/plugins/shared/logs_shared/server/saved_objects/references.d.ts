import * as rt from 'io-ts';
import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
export type SavedObjectAttributesWithReferences<SavedObjectAttributes> = Pick<SavedObject<SavedObjectAttributes>, 'attributes' | 'references'>;
export type SavedObjectReferenceExtractor<SavedObjectAttributes> = (savedObjectAttributes: SavedObjectAttributes) => SavedObjectAttributesWithReferences<SavedObjectAttributes>;
export type SavedObjectReferenceResolver<SavedObjectAttributes> = (savedObjectAttributes: SavedObjectAttributes, references: SavedObjectReference[]) => SavedObjectAttributes;
export declare const savedObjectReferenceRT: rt.ExactC<rt.TypeC<{
    name: rt.StringC;
    type: rt.StringC;
    id: rt.StringC;
}>>;
/**
 * Rewrites a saved object such that well-known saved object references
 * are extracted in the `references` array and replaced by the appropriate
 * name. This is the inverse operation to `resolveSavedObjectReferences`.
 */
export declare const extractSavedObjectReferences: <SavedObjectAttributes>(referenceExtractors: Array<SavedObjectReferenceExtractor<SavedObjectAttributes>>) => (savedObjectAttributes: SavedObjectAttributes) => SavedObjectAttributesWithReferences<SavedObjectAttributes>;
/**
 * Rewrites a source configuration such that well-known saved object references
 * are resolved from the `references` argument and replaced by the real saved
 * object ids. This is the inverse operation to `extractSavedObjectReferences`.
 */
export declare const resolveSavedObjectReferences: <SavedObjectAttributes>(referenceResolvers: Array<SavedObjectReferenceResolver<SavedObjectAttributes>>) => (attributes: SavedObjectAttributes, references: SavedObjectReference[]) => SavedObjectAttributes;
export declare class SavedObjectReferenceResolutionError extends Error {
    constructor(message?: string);
}
