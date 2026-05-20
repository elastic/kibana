import type { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type { SavedObjectMigrationParams } from '@kbn/core-saved-objects-server';
import type { MigrateFunction } from '@kbn/kibana-utils-plugin/common';
import type { AttachmentPersistedAttributes } from '../../common/types/attachments_v1';
import type { PersistableStateAttachmentAttributes, UserCommentAttachmentAttributes } from '../../../common/types/domain';
export declare function logError({ id, context, error, docType, docKey, }: {
    id: string;
    context: SavedObjectMigrationContext;
    error: Error;
    docType: string;
    docKey: string;
}): void;
type CaseMigration<T> = (doc: SavedObjectUnsanitizedDoc<T>) => SavedObjectUnsanitizedDoc<T>;
export declare function pipeMigrations<T>(...migrations: Array<CaseMigration<T>>): CaseMigration<T>;
export declare const isDeferredMigration: (minDeferredKibanaVersion: string, migrationVersion: string) => boolean;
export declare const isUserCommentSO: (doc: SavedObjectUnsanitizedDoc<AttachmentPersistedAttributes>) => doc is SavedObjectUnsanitizedDoc<UserCommentAttachmentAttributes>;
export declare const isPersistableStateAttachmentSO: (doc: SavedObjectUnsanitizedDoc<AttachmentPersistedAttributes>) => doc is SavedObjectUnsanitizedDoc<PersistableStateAttachmentAttributes>;
interface GetLensMigrationsArgs<T> {
    lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
    migratorFactory: (migrate: MigrateFunction, migrationVersion: string) => SavedObjectMigrationParams<T, T>;
}
export declare const getLensMigrations: <T>({ lensEmbeddableFactory, migratorFactory, }: GetLensMigrationsArgs<T>) => {
    [x: string]: SavedObjectMigrationParams<T, T>;
};
export {};
