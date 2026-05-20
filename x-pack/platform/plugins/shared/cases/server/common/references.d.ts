import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
export declare const getCaseReferenceId: (references: SavedObjectReference[]) => string | undefined;
export declare const findReferenceId: (name: string, type: string, references?: SavedObjectReference[]) => string | undefined;
