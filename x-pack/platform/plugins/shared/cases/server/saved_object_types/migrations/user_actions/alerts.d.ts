import type { SavedObjectMigrationContext, SavedObjectSanitizedDoc, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import type { UserActionVersion800 } from './types';
export declare function removeRuleInformation(doc: SavedObjectUnsanitizedDoc<UserActionVersion800>, context: SavedObjectMigrationContext): SavedObjectSanitizedDoc<unknown>;
