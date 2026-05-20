import type { DataStreamDefinition } from '@kbn/data-streams';
import type { Discovery } from '@kbn/streams-schema';
import type { GetFieldsOf } from '@kbn/es-mappings';
export declare const DISCOVERIES_DATA_STREAM = ".significant_events-discoveries";
export declare const discoveriesMappings: {
    dynamic: false;
    properties: {
        '@timestamp': import("@kbn/es-mappings").DateMapping;
        kind: import("@kbn/es-mappings").KeywordMapping;
        discovery_id: import("@kbn/es-mappings").KeywordMapping;
        discovery_slug: import("@kbn/es-mappings").KeywordMapping;
        closes: import("@kbn/es-mappings").KeywordMapping;
        grouped_into: import("@kbn/es-mappings").KeywordMapping;
        criticality: import("@kbn/es-mappings").IntegerMapping;
        closed_by_execution_id: import("@kbn/es-mappings").KeywordMapping;
    };
};
export type StoredDiscovery = GetFieldsOf<typeof discoveriesMappings>;
export type { Discovery };
export declare const discoveriesDataStream: DataStreamDefinition<typeof discoveriesMappings, StoredDiscovery>;
