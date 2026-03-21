import type { SavedObjectMigrationContext, SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import type { EncryptedSavedObjectsService, EncryptedSavedObjectTypeRegistration } from './crypto';
type SavedObjectOptionalMigrationFn<InputAttributes, MigratedAttributes> = (doc: SavedObjectUnsanitizedDoc<InputAttributes> | SavedObjectUnsanitizedDoc<MigratedAttributes>, context: SavedObjectMigrationContext) => SavedObjectUnsanitizedDoc<MigratedAttributes>;
export type IsMigrationNeededPredicate<InputAttributes, MigratedAttributes> = (encryptedDoc: SavedObjectUnsanitizedDoc<InputAttributes> | SavedObjectUnsanitizedDoc<MigratedAttributes>) => encryptedDoc is SavedObjectUnsanitizedDoc<InputAttributes>;
export interface CreateEncryptedSavedObjectsMigrationFnOpts<InputAttributes = unknown, MigratedAttributes = InputAttributes> {
    isMigrationNeededPredicate: IsMigrationNeededPredicate<InputAttributes, MigratedAttributes>;
    migration: SavedObjectMigrationFn<InputAttributes, MigratedAttributes>;
    shouldMigrateIfDecryptionFails?: boolean;
    inputType?: EncryptedSavedObjectTypeRegistration;
    migratedType?: EncryptedSavedObjectTypeRegistration;
}
export type CreateEncryptedSavedObjectsMigrationFn = <InputAttributes = unknown, MigratedAttributes = InputAttributes>(opts: CreateEncryptedSavedObjectsMigrationFnOpts<InputAttributes, MigratedAttributes>) => SavedObjectOptionalMigrationFn<InputAttributes, MigratedAttributes>;
export declare const getCreateMigration: (encryptedSavedObjectsService: Readonly<EncryptedSavedObjectsService>, instantiateServiceWithLegacyType: (typeRegistration: EncryptedSavedObjectTypeRegistration) => EncryptedSavedObjectsService) => CreateEncryptedSavedObjectsMigrationFn;
export {};
