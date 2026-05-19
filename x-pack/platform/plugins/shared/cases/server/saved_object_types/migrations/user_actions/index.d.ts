import type { SavedObjectMigrationMap } from '@kbn/core/server';
import type { PersistableStateAttachmentTypeRegistry } from '../../../attachment_framework/persistable_state_registry';
export interface UserActionsMigrationsDeps {
    persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
}
export declare const createUserActionsMigrations: (deps: UserActionsMigrationsDeps) => SavedObjectMigrationMap;
