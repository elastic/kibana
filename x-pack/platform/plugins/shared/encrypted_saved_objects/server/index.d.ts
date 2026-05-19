import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
export type { EncryptedSavedObjectTypeRegistration, AttributeToEncrypt } from './crypto';
export { EncryptionError, EncryptionErrorOperation } from './crypto';
export type { EncryptedSavedObjectsPluginSetup, EncryptedSavedObjectsPluginStart } from './plugin';
export type { EncryptedSavedObjectsClient, EncryptedSavedObjectsClientOptions, ClientInstanciator, } from './saved_objects';
export type { IsMigrationNeededPredicate, CreateEncryptedSavedObjectsMigrationFn, CreateEncryptedSavedObjectsMigrationFnOpts, } from './create_migration';
export declare const config: PluginConfigDescriptor;
export declare const plugin: (initializerContext: PluginInitializerContext) => Promise<import("./plugin").EncryptedSavedObjectsPlugin>;
