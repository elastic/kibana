import type { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '@kbn/core/server';
export { caseMigrations } from './cases';
export { configureMigrations } from './configuration';
export { createUserActionsMigrations } from './user_actions';
export type { CreateCommentsMigrationsDeps } from './comments';
export { createCommentsMigrations } from './comments';
export interface SanitizedCaseOwner {
    owner: string;
}
export declare const addOwnerToSO: <T = Record<string, unknown>>(doc: SavedObjectUnsanitizedDoc<T>) => SavedObjectSanitizedDoc<SanitizedCaseOwner>;
export declare const connectorMappingsMigrations: {
    '7.14.0': (doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>) => SavedObjectSanitizedDoc<SanitizedCaseOwner>;
};
