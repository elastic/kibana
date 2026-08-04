import type { SavedObjectReference } from '@kbn/core/types';
import type { StoredMapAttributes } from '../../server';
export declare function extractReferences({ attributes, references, }: {
    attributes: StoredMapAttributes;
    references?: SavedObjectReference[];
}): {
    attributes: StoredMapAttributes;
    references: import("@kbn/core/server").SavedObjectReference[];
};
export declare function injectReferences({ attributes, findReference, }: {
    attributes: StoredMapAttributes;
    findReference: (name: string) => SavedObjectReference | undefined;
}): {
    attributes: StoredMapAttributes;
};
