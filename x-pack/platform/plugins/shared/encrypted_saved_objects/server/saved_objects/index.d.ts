import { type Logger, type SavedObjectsServiceSetup, type StartServicesAccessor } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient, EncryptedSavedObjectsClientOptions } from '@kbn/encrypted-saved-objects-shared';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { normalizeNamespace } from './get_descriptor_namespace';
import { SavedObjectsEncryptionExtension } from './saved_objects_encryption_extension';
import type { EncryptedSavedObjectsService } from '../crypto';
export { normalizeNamespace, SavedObjectsEncryptionExtension };
export type { EncryptedSavedObjectsClient, EncryptedSavedObjectsClientOptions };
interface SetupSavedObjectsParams {
    service: PublicMethodsOf<EncryptedSavedObjectsService>;
    savedObjects: SavedObjectsServiceSetup;
    getStartServices: StartServicesAccessor;
    logger: Logger;
}
export declare const createUnsupportedEncryptedTypeError: (type: string) => import("@kbn/core-saved-objects-server").DecoratedError;
export type ClientInstanciator = (options?: EncryptedSavedObjectsClientOptions) => EncryptedSavedObjectsClient;
export declare function setupSavedObjects({ service, savedObjects, getStartServices, logger, }: SetupSavedObjectsParams): ClientInstanciator;
