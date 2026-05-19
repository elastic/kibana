import type { FieldsMetadataMap } from '../models/fields_metadata_dictionary';
import type { PartialFieldMetadataPlain } from '../types';
export declare const SUPPORTED_PREFIXES: readonly ["resource.attributes.", "attributes."];
interface ExtractedParts {
    prefix: string | null;
    fieldNameWithoutPrefix: string;
}
/**
 * Extracts prefix and base field name from a potentially prefixed field name.
 * Supports: 'attributes.*' and 'resource.attributes.*'
 */
export declare function extractPrefixParts(fieldName: string): ExtractedParts;
/**
 * Creates a proxied fields map that dynamically handles prefixed field lookups for FieldMetadata instances.
 * When accessing a field like 'resource.attributes.service.name', if not found,
 * it will look for 'service.name' and create a prefixed variant on-the-fly.
 *
 * This ensures consistent behavior between getByName() and find() methods
 * without triplicating the payload with all prefix variants.
 */
export declare function createProxiedFieldsMap(fields: FieldsMetadataMap): FieldsMetadataMap;
/**
 * Creates a proxied fields map for plain field metadata objects (used on client-side).
 * Works the same way as createProxiedFieldsMap but for plain objects instead of FieldMetadata instances.
 */
export declare function createProxiedPlainFields(fields: Record<string, PartialFieldMetadataPlain>): Record<string, PartialFieldMetadataPlain>;
export {};
