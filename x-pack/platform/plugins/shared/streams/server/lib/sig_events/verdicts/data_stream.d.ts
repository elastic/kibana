import type { DataStreamDefinition } from '@kbn/data-streams';
import type { Verdict } from '@kbn/streams-schema';
import type { GetFieldsOf } from '@kbn/es-mappings';
export declare const VERDICTS_DATA_STREAM = ".significant_events-verdicts";
export declare const verdictsMappings: {
    dynamic: false;
    properties: {
        '@timestamp': import("@kbn/es-mappings").DateMapping;
        verdict: import("@kbn/es-mappings").KeywordMapping;
        verdict_id: import("@kbn/es-mappings").KeywordMapping;
        discovery_id: import("@kbn/es-mappings").KeywordMapping;
        discovery_slug: import("@kbn/es-mappings").KeywordMapping;
    };
};
export type StoredVerdict = GetFieldsOf<typeof verdictsMappings>;
export type { Verdict };
export declare const verdictsDataStream: DataStreamDefinition<typeof verdictsMappings, StoredVerdict>;
