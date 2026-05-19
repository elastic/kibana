import type { SavedObjectAttribute, SavedObjectReference } from '@kbn/core/server';
import type { RelatedSavedObjects } from './related_saved_objects';
export declare const ACTION_REF_NAME = "actionRef";
export declare function extractSavedObjectReferences(actionId: string, isInMemory: boolean, relatedSavedObjects?: RelatedSavedObjects): {
    references: SavedObjectReference[];
    relatedSavedObjectWithRefs?: RelatedSavedObjects;
};
export declare function injectSavedObjectReferences(references: SavedObjectReference[], relatedSavedObjects?: RelatedSavedObjects): {
    actionId?: string;
    relatedSavedObjects?: SavedObjectAttribute;
};
