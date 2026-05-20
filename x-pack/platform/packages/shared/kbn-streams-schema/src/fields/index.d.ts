import type { MappingBooleanProperty, MappingByteNumberProperty, MappingDateNanosProperty, MappingDateProperty, MappingDoubleNumberProperty, MappingFloatNumberProperty, MappingGeoPointProperty, MappingHalfFloatNumberProperty, MappingIntegerNumberProperty, MappingIpProperty, MappingKeywordProperty, MappingLongNumberProperty, MappingMatchOnlyTextProperty, MappingProperty, MappingShortNumberProperty, MappingTextProperty, MappingUnsignedLongNumberProperty, MappingVersionProperty, MappingWildcardProperty } from '@elastic/elasticsearch/lib/api/types';
import type { z } from '@kbn/zod/v4';
export declare const FIELD_DEFINITION_TYPES: readonly ["keyword", "match_only_text", "long", "double", "date", "boolean", "ip", "geo_point", "integer", "short", "byte", "float", "half_float", "text", "wildcard", "version", "unsigned_long", "date_nanos"];
export type FieldDefinitionType = (typeof FIELD_DEFINITION_TYPES)[number];
export declare const ALL_FIELD_DEFINITION_TYPES: readonly ["keyword", "match_only_text", "long", "double", "date", "boolean", "ip", "geo_point", "integer", "short", "byte", "float", "half_float", "text", "wildcard", "version", "unsigned_long", "date_nanos", "system"];
export type AllFieldDefinitionType = (typeof ALL_FIELD_DEFINITION_TYPES)[number];
export type FieldDefinitionConfig = (MappingProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
})
/**
 * Documentation-only override for an inherited field: a stream may override only the description
 * without freezing the inherited ES mapping. In that case `type` MUST be omitted entirely.
 */
 | {
    description: string;
    type?: never;
    format?: never;
} | {
    type: 'system';
    description?: string;
};
export type FieldDefinitionConfigAdvancedParameters = Omit<FieldDefinitionConfig, 'type' | 'format' | 'description'>;
export declare const fieldDefinitionConfigSchema: z.ZodType<(MappingBooleanProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingKeywordProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingMatchOnlyTextProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingTextProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingVersionProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingWildcardProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDateNanosProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDateProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingIpProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingGeoPointProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingByteNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDoubleNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingFloatNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingHalfFloatNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingIntegerNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingLongNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingShortNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingUnsignedLongNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | {
    description: string;
    type?: never;
    format?: never;
} | {
    type: "system";
    description?: string;
}, unknown, z.core.$ZodTypeInternals<(MappingBooleanProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingKeywordProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingMatchOnlyTextProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingTextProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingVersionProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingWildcardProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDateNanosProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDateProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingIpProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingGeoPointProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingByteNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDoubleNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingFloatNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingHalfFloatNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingIntegerNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingLongNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingShortNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingUnsignedLongNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | {
    description: string;
    type?: never;
    format?: never;
} | {
    type: "system";
    description?: string;
}, unknown>>;
export interface FieldDefinition {
    [x: string]: FieldDefinitionConfig;
}
export type AllowedMappingProperty = MappingKeywordProperty | MappingMatchOnlyTextProperty | MappingLongNumberProperty | MappingDoubleNumberProperty | MappingDateProperty | MappingBooleanProperty | MappingIpProperty | MappingGeoPointProperty | MappingIntegerNumberProperty | MappingShortNumberProperty | MappingByteNumberProperty | MappingFloatNumberProperty | MappingHalfFloatNumberProperty | MappingTextProperty | MappingWildcardProperty | MappingVersionProperty | MappingUnsignedLongNumberProperty | MappingDateNanosProperty;
export type StreamsMappingProperties = Record<string, AllowedMappingProperty>;
export declare function isMappingProperties(value: FieldDefinition): value is StreamsMappingProperties;
export declare const fieldDefinitionSchema: z.Schema<FieldDefinition>;
/**
 * Schema for classic stream field overrides.
 * Classic streams require a `type` for all field overrides - description-only fields are not supported.
 * This schema excludes the documentation-only override variant that allows type to be omitted.
 */
export type ClassicFieldDefinitionConfig = (MappingProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | {
    type: 'system';
    description?: string;
};
export declare const classicFieldDefinitionConfigSchema: z.ZodType<(MappingBooleanProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingKeywordProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingMatchOnlyTextProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingTextProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingVersionProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingWildcardProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDateNanosProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDateProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingIpProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingGeoPointProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingByteNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDoubleNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingFloatNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingHalfFloatNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingIntegerNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingLongNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingShortNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingUnsignedLongNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | {
    type: "system";
    description?: string;
}, unknown, z.core.$ZodTypeInternals<(MappingBooleanProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingKeywordProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingMatchOnlyTextProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingTextProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingVersionProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingWildcardProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDateNanosProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDateProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingIpProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingGeoPointProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingByteNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingDoubleNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingFloatNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingHalfFloatNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingIntegerNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingLongNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingShortNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | (MappingUnsignedLongNumberProperty & {
    type: FieldDefinitionType;
    format?: string;
    description?: string;
}) | {
    type: "system";
    description?: string;
}, unknown>>;
export interface ClassicFieldDefinition {
    [x: string]: ClassicFieldDefinitionConfig;
}
export declare const classicFieldDefinitionSchema: z.Schema<ClassicFieldDefinition>;
export type InheritedFieldDefinitionConfig = FieldDefinitionConfig & {
    from: string;
    alias_for?: string;
};
export interface InheritedFieldDefinition {
    [x: string]: InheritedFieldDefinitionConfig;
}
export declare const inheritedFieldDefinitionSchema: z.Schema<InheritedFieldDefinition>;
export type NamedFieldDefinitionConfig = FieldDefinitionConfig & {
    name: string;
};
export declare const namedFieldDefinitionConfigSchema: z.Schema<NamedFieldDefinitionConfig>;
