import type { Crypto } from '@elastic/node-crypto';
import type { Logger } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
/**
 * Describes the attributes to encrypt. By default, attribute values won't be exposed to end-users
 * and can only be consumed by the internal Kibana server. If end-users should have access to the
 * encrypted values use `dangerouslyExposeValue: true`
 */
export interface AttributeToEncrypt {
    readonly key: string;
    readonly dangerouslyExposeValue?: boolean;
}
/**
 * Describes the registration entry for the saved object type that contain attributes that need to
 * be encrypted.
 */
export interface EncryptedSavedObjectTypeRegistration {
    readonly type: string;
    readonly attributesToEncrypt: ReadonlySet<string | AttributeToEncrypt>;
    readonly attributesToIncludeInAAD?: ReadonlySet<string>;
    readonly enforceRandomId?: boolean;
}
/**
 * Uniquely identifies saved object.
 */
export interface SavedObjectDescriptor {
    readonly id: string;
    readonly type: string;
    readonly namespace?: string;
}
/**
 * Describes parameters that are common for all EncryptedSavedObjectsService public methods.
 */
interface CommonParameters {
    /**
     * User on behalf of the method is called if determined.
     */
    user?: AuthenticatedUser;
}
/**
 * Describes parameters for the decrypt methods.
 */
interface DecryptParameters extends CommonParameters {
    /**
     * Indicates whether decryption should only be performed using secondary decryption-only keys.
     */
    omitPrimaryEncryptionKey?: boolean;
    /**
     * Indicates whether the object to be decrypted is being converted from a single-namespace type to a multi-namespace type. In this case,
     * we may need to attempt decryption twice: once with a namespace in the descriptor (for use during index migration), and again without a
     * namespace in the descriptor (for use during object migration). In other words, if the object is being decrypted during index migration,
     * the object was previously encrypted with its namespace in the descriptor portion of the AAD; on the other hand, if the object is being
     * decrypted during object migration, the object was never encrypted with its namespace in the descriptor portion of the AAD.
     */
    isTypeBeingConverted?: boolean;
    /**
     * If the originId (old object ID) is present and the object is being converted from a single-namespace type to a multi-namespace type,
     * we will attempt to decrypt with both the old object ID and the current object ID.
     */
    originId?: string;
}
interface EncryptedSavedObjectsServiceOptions {
    /**
     * Service logger instance.
     */
    logger: Logger;
    /**
     * NodeCrypto instance used for both encryption and decryption.
     */
    primaryCrypto?: Crypto;
    /**
     * NodeCrypto instances used ONLY for decryption (i.e. rotated encryption keys).
     */
    decryptionOnlyCryptos?: Readonly<Crypto[]>;
}
/**
 * Utility function that gives array representation of the saved object descriptor respecting
 * optional `namespace` property.
 * @param descriptor Saved Object descriptor to turn into array.
 */
export declare function descriptorToArray(descriptor: SavedObjectDescriptor): string[];
/**
 * Represents the service that tracks all saved object types that might contain attributes that need
 * to be encrypted before they are stored and eventually decrypted when retrieved. The service
 * performs encryption only based on registered saved object types that are known to contain such
 * attributes.
 */
export declare class EncryptedSavedObjectsService {
    private readonly options;
    /**
     * Map of all registered saved object types where the `key` is saved object type and the `value`
     * is the definition (names of attributes that need to be encrypted etc.).
     */
    private readonly typeDefinitions;
    constructor(options: EncryptedSavedObjectsServiceOptions);
    /**
     * Registers saved object type as the one that contains attributes that should be encrypted.
     * @param typeRegistration Saved object type registration parameters.
     * @throws Will throw if `attributesToEncrypt` is empty.
     * @throws Will throw if the type is already registered.
     * @throws Will throw if the type is not known saved object type.
     */
    registerType(typeRegistration: EncryptedSavedObjectTypeRegistration): void;
    /**
     * Checks whether specified saved object type is registered as the one that contains attributes
     * that should be encrypted.
     * @param type Saved object type.
     */
    isRegistered(type: string): boolean;
    /**
     * Gets an array containing all registered type name
     *
     * @returns Array<string> - all SO type names registered with the ESO service
     */
    getRegisteredTypes(): string[];
    /**
     * Gets a hash map for all types registered with the ESO service
     *
     * @returns Record<string, string> - type names and unique hash
     */
    getRegisteredTypeHashMap(): Record<string, string>;
    /**
     * Checks whether the ESO type has explicitly opted out of enforcing random IDs.
     * @param type Saved object type.
     * @returns boolean - true unless explicitly opted out by setting enforceRandomId to false
     */
    shouldEnforceRandomId(type: string): boolean;
    /**
     * Returns the set of attribute names that are encrypted for the given type.
     * Returns undefined if the type is not registered.
     * @param type Saved object type.
     */
    getEncryptedAttributes(type: string): ReadonlySet<string> | undefined;
    /**
     * Takes saved object attributes for the specified type and, depending on the type definition,
     * either decrypts or strips encrypted attributes (e.g. in case AAD or encryption key has changed
     * and decryption is no longer possible).
     * @param descriptor Saved object descriptor (ID, type and optional namespace)
     * @param attributes Object that includes a dictionary of __ALL__ saved object attributes stored
     * in Elasticsearch.
     * @param [originalAttributes] An optional dictionary of __ALL__ saved object original attributes
     * that were used to create that saved object (i.e. values are NOT encrypted).
     * @param [params] Parameters that control the way encrypted attributes are handled.
     */
    stripOrDecryptAttributes<T extends Record<string, unknown>>(descriptor: SavedObjectDescriptor, attributesToStripOrDecrypt: T, originalAttributes?: T, params?: DecryptParameters): Promise<{
        attributes: T & {};
        error?: undefined;
    } | {
        attributes: T;
        error: any;
    }>;
    /**
     * Takes saved object attributes for the specified type and, depending on the type definition,
     * either decrypts or strips encrypted attributes (e.g. in case AAD or encryption key has changed
     * and decryption is no longer possible).
     * @param descriptor Saved object descriptor (ID, type and optional namespace)
     * @param attributesToStripOrDecrypt Object that includes a dictionary of __ALL__ saved object attributes stored
     * in Elasticsearch.
     * @param [originalAttributes] An optional dictionary of __ALL__ saved object original attributes
     * that were used to create that saved object (i.e. values are NOT encrypted).
     * @param [params] Parameters that control the way encrypted attributes are handled.
     */
    stripOrDecryptAttributesSync<T extends Record<string, unknown>>(descriptor: SavedObjectDescriptor, attributesToStripOrDecrypt: T, originalAttributes?: T, params?: DecryptParameters): {
        attributes: T & {};
        error?: undefined;
    } | {
        attributes: T;
        error: any;
    };
    /**
     * Takes saved object attributes for the specified type and, depending on the type definition,
     * either strips encrypted attributes, replaces with original decrypted value if available, or
     * prepares them for decryption.
     * @internal
     */
    private prepareAttributesForStripOrDecrypt;
    private attributesToEncryptIterator;
    /**
     * Takes saved object attributes for the specified type and encrypts all of them that are supposed
     * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
     * attributes were encrypted original attributes dictionary is returned.
     * @param descriptor Descriptor of the saved object to encrypt attributes for.
     * @param attributes Dictionary of __ALL__ saved object attributes.
     * @param [params] Additional parameters.
     * @throws Will throw if encryption fails for whatever reason.
     */
    encryptAttributes<T extends Record<string, unknown>>(descriptor: SavedObjectDescriptor, attributes: T, params?: CommonParameters): Promise<T>;
    /**
     * Takes saved object attributes for the specified type and encrypts all of them that are supposed
     * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
     * attributes were encrypted original attributes dictionary is returned.
     * @param descriptor Descriptor of the saved object to encrypt attributes for.
     * @param attributes Dictionary of __ALL__ saved object attributes.
     * @param [params] Additional parameters.
     * @throws Will throw if encryption fails for whatever reason.
     */
    encryptAttributesSync<T extends Record<string, unknown>>(descriptor: SavedObjectDescriptor, attributes: T, params?: CommonParameters): T;
    /**
     * Takes saved object attributes for the specified type and decrypts all of them that are supposed
     * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
     * attributes were decrypted original attributes dictionary is returned.
     * @param descriptor Descriptor of the saved object to decrypt attributes for.
     * @param attributes Dictionary of __ALL__ saved object attributes.
     * @param [params] Additional parameters.
     * @throws Will throw if decryption fails for whatever reason.
     * @throws Will throw if any of the attributes to decrypt is not a string.
     */
    decryptAttributes<T extends Record<string, unknown>>(descriptor: SavedObjectDescriptor, attributes: T, params?: DecryptParameters): Promise<T>;
    /**
     * Takes saved object attributes for the specified type and decrypts all of them that are supposed
     * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
     * attributes were decrypted original attributes dictionary is returned.
     * @param descriptor Descriptor of the saved object to decrypt attributes for.
     * @param attributes Dictionary of __ALL__ saved object attributes.
     * @param [params] Additional parameters.
     * @throws Will throw if decryption fails for whatever reason.
     * @throws Will throw if any of the attributes to decrypt is not a string.
     */
    decryptAttributesSync<T extends Record<string, unknown>>(descriptor: SavedObjectDescriptor, attributes: T, params?: DecryptParameters): T;
    private attributesToDecryptIterator;
    /**
     * Generates string representation of the Additional Authenticated Data based on the specified saved
     * object type and attributes.
     * @param typeDefinition Encrypted saved object type definition.
     * @param descriptor Descriptor of the saved object to get AAD for.
     * @param attributes All attributes of the saved object instance of the specified type.
     */
    private getAAD;
    /**
     * Returns list of NodeCrypto instances used for decryption.
     * @param omitPrimaryEncryptionKey Specifies whether returned decrypters shouldn't include primary
     * encryption/decryption crypto.
     */
    private getDecrypters;
    __dangerousClone(typeRegistrationOverrides?: EncryptedSavedObjectTypeRegistration[]): EncryptedSavedObjectsService;
}
export {};
