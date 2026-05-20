import type { FieldDefinitionConfig } from '../fields';
export declare const getAdvancedParameters: (fieldName: string, fieldConfig: FieldDefinitionConfig) => Partial<(import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingVersionProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingWildcardProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingDateNanosProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingIpProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingGeoPointProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingByteNumberProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingDoubleNumberProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingFloatNumberProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingHalfFloatNumberProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingIntegerNumberProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingShortNumberProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | (import("@elastic/elasticsearch/lib/api/types").MappingUnsignedLongNumberProperty & {
    type: import("../fields").FieldDefinitionType;
    format?: string;
    description?: string;
}) | {
    description: string;
    type?: never;
    format?: never;
} | {
    type: "system";
    description?: string;
}>;
