import type { CoreSetup, ISavedObjectTypeRegistry, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { type CreateEncryptedSavedObjectsMigrationFn } from './create_migration';
import { type CreateEsoModelVersionFn } from './create_model_version';
import type { EncryptedSavedObjectTypeRegistration } from './crypto';
import { EncryptionError } from './crypto';
import type { ClientInstanciator } from './saved_objects';
import { SavedObjectsEncryptionExtension } from './saved_objects';
export interface PluginsSetup {
    security?: SecurityPluginSetup;
}
export interface EncryptedSavedObjectsPluginSetup {
    /**
     * Indicates if Saved Object encryption is possible. Requires an encryption key to be explicitly set via `xpack.encryptedSavedObjects.encryptionKey`.
     */
    canEncrypt: boolean;
    registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) => void;
    createMigration: CreateEncryptedSavedObjectsMigrationFn;
    createModelVersion: CreateEsoModelVersionFn;
    /**
     * This function is exposed for Core migration testing purposes only.
     */
    __testCreateDangerousExtension: (typeRegistry: ISavedObjectTypeRegistry, typeRegistrationOverrides?: EncryptedSavedObjectTypeRegistration[]) => SavedObjectsEncryptionExtension;
}
export interface EncryptedSavedObjectsPluginStart {
    isEncryptionError: (error: Error) => boolean;
    getClient: ClientInstanciator;
}
/**
 * Represents EncryptedSavedObjects Plugin instance that will be managed by the Kibana plugin system.
 */
export declare class EncryptedSavedObjectsPlugin implements Plugin<EncryptedSavedObjectsPluginSetup, EncryptedSavedObjectsPluginStart, PluginsSetup> {
    #private;
    private readonly initializerContext;
    private readonly logger;
    private savedObjectsSetup;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup, _deps: PluginsSetup): EncryptedSavedObjectsPluginSetup;
    start(): {
        isEncryptionError: (error: Error) => error is EncryptionError;
        getClient: (options?: {}) => import("@kbn/encrypted-saved-objects-shared/src/encrypted_saved_objects_client_types").EncryptedSavedObjectsClient;
    };
    stop(): void;
}
