import type { SavedObjectMigrationContext, SavedObjectReference, SavedObjectSanitizedDoc, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import type { UserActions } from './types';
export declare function payloadMigration(doc: SavedObjectUnsanitizedDoc<UserActions>, context: SavedObjectMigrationContext): SavedObjectSanitizedDoc<unknown>;
export declare const getUserActionType: (fields: string[], action: string) => string;
export declare const getPayload: (type: string, action_field: string[], new_value: string | null, old_value: string | null, owner: string) => Record<string, unknown>;
export declare const removeOldReferences: (references: SavedObjectUnsanitizedDoc<UserActions>["references"]) => SavedObjectReference[];
