import type { IndicesIndexSettings, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { FieldDefinition, InheritedFieldDefinition, Streams } from '@kbn/streams-schema';
export declare const otelEquivalentLookupMap: {
    [k: string]: string;
};
export declare const otelLogsSettings: IndicesIndexSettings;
export declare const otelBaseFields: FieldDefinition;
export declare const NAMESPACE_PRIORITIES: Record<string, number>;
export declare const REQUIRED_RESOURCE_ATTRIBUTES_FIELDS: {
    'host.name': {
        type: "keyword";
    };
    'service.name': {
        type: "keyword";
    };
};
export declare const otelBaseMappings: Exclude<MappingTypeMapping['properties'], undefined>;
export declare function addAliasesForNamespacedFields(streamDefinition: Streams.WiredStream.Definition, inheritedFields: InheritedFieldDefinition): InheritedFieldDefinition;
