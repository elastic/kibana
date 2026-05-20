import type { SavedObjectsType } from '@kbn/core/server';
import type { UserActionsMigrationsDeps } from './migrations/user_actions';
/**
 * The comments in the mapping indicate the additional properties that are stored in Elasticsearch but are not indexed.
 * Remove these comments when https://github.com/elastic/kibana/issues/152756 is resolved.
 */
export declare const createCaseUserActionSavedObjectType: (migrationDeps: UserActionsMigrationsDeps) => SavedObjectsType;
