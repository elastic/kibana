/**
 * Elasticsearch mappings for change history documents.
 * Uses unmapped fields for variable structures (`object.snapshot`: full object after each change)
 * and flattened type for `metadata`.
 * Do not map `kibana.space_ids` here — `@kbn/data-streams` injects reserved `kibana` mappings for all data streams.
 * For field reference @see [README.md]
 */
export declare const changeHistoryMappings: {
    v1: {
        dynamic: false;
        properties: {
            '@timestamp': Omit<import("@elastic/elasticsearch/lib/api/types").MappingDateProperty, "properties"> & {
                dynamic?: import("@kbn/es-mappings").StrictDynamic;
            };
            user: import("@kbn/es-mappings").ObjectMapping<{
                id: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
                name: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
            }>;
            event: import("@kbn/es-mappings").ObjectMapping<{
                id: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
                module: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
                dataset: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
                action: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
                type: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
            }>;
            span: import("@kbn/es-mappings").ObjectMapping<{
                id: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
            }>;
            object: import("@kbn/es-mappings").ObjectMapping<{
                id: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
                type: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
                sequence: Omit<import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
            }>;
            tags: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                dynamic?: import("@kbn/es-mappings").StrictDynamic;
            };
            metadata: Omit<import("@elastic/elasticsearch/lib/api/types").MappingFlattenedProperty, "properties"> & {
                dynamic?: import("@kbn/es-mappings").StrictDynamic;
            };
            service: import("@kbn/es-mappings").ObjectMapping<{
                version: Omit<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty, "properties"> & {
                    dynamic?: import("@kbn/es-mappings").StrictDynamic;
                };
            }>;
        };
    };
};
