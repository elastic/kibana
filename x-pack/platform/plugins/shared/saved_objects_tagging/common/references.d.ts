import type { SavedObject, SavedObjectReference, SavedObjectsFindOptionsReference } from '@kbn/core/server';
import type { Tag } from './types';
type SavedObjectReferenceLike = SavedObjectReference | SavedObjectsFindOptionsReference;
/**
 * Create a {@link SavedObjectReference | reference} for given tag id.
 */
export declare const tagIdToReference: (tagId: string) => SavedObjectReference;
/**
 * Update the given `references` array, replacing all the `tag` references with
 * references for the given `newTagIds`, while preserving all references to non-tag objects.
 */
export declare const replaceTagReferences: (references: SavedObjectReference[], newTagIds: string[]) => SavedObjectReference[];
/**
 * Update the given `references` array, adding references to `toAdd` tag ids and removing references
 * to `toRemove` tag ids.
 * All references to non-tag objects will be preserved.
 *
 * @remarks: Having the same id(s) in `toAdd` and `toRemove` will result in an error.
 */
export declare const updateTagReferences: ({ references, toAdd, toRemove, }: {
    references: SavedObjectReference[];
    toAdd?: string[];
    toRemove?: string[];
}) => SavedObjectReference[];
export declare const getTagsFromReferences: (references: SavedObjectReference[], allTags: Tag[]) => {
    tags: Tag[];
    missingRefs: SavedObjectReference[];
};
export declare const convertTagNameToId: (tagName: string, allTags: Tag[]) => string | undefined;
export declare const getObjectTags: (object: {
    references: SavedObject["references"];
}, allTags: Tag[]) => {
    tags: Tag[];
    missingRefs: SavedObjectReference[];
};
export declare const getTag: (tagId: string, allTags: Tag[]) => Tag | undefined;
export declare const getTagIdsFromReferences: (references: SavedObjectReferenceLike[]) => string[];
export {};
