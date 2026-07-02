import type { EncryptedSavedObjectTypeRegistration } from './encrypted_saved_objects_service';
/**
 * Represents the definition of the attributes of the specific saved object that are supposed to be
 * encrypted. The definition also dictates which attributes should be included in AAD and/or
 * stripped from response.
 */
export declare class EncryptedSavedObjectAttributesDefinition {
    readonly attributesToEncrypt: ReadonlySet<string>;
    readonly attributesToIncludeInAAD: ReadonlySet<string> | undefined;
    private readonly attributesToStrip;
    readonly enforceRandomId: boolean;
    constructor(typeRegistration: EncryptedSavedObjectTypeRegistration);
    /**
     * Determines whether particular attribute should be encrypted. Full list of attributes that
     * should be encrypted can be retrieved via `attributesToEncrypt` property.
     * @param attributeName Name of the attribute.
     */
    shouldBeEncrypted(attributeName: string): boolean;
    /**
     * Determines whether particular attribute should be included in AAD.
     * @param attributeName Name of the attribute.
     */
    shouldBeIncludedInAAD(attributeName: string): boolean;
    /**
     * Determines whether particular attribute should be stripped from the attribute list.
     * @param attributeName Name of the attribute.
     */
    shouldBeStripped(attributeName: string): boolean;
    /**
     * Collects all attributes (both keys and values) that should contribute to AAD.
     * @param attributes Attributes of the saved object
     */
    collectAttributesForAAD(attributes: Record<string, unknown>): Record<string, unknown>;
    /**
     * Gets a unique hash value based on the ESO type properties
     * @param typeName optional name of the type.
     * @returns string - unique hash for the eso definition, including name if provided
     */
    getDefinitionHash(typeName?: string): string;
}
