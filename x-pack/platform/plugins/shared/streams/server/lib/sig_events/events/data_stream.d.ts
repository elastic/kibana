import type { DataStreamDefinition } from '@kbn/data-streams';
import type { SigEvent } from '@kbn/streams-schema';
import type { GetFieldsOf } from '@kbn/es-mappings';
export declare const EVENTS_DATA_STREAM = ".significant_events-events";
export declare const eventsMappings: {
    dynamic: false;
    properties: {
        '@timestamp': import("@kbn/es-mappings").DateMapping;
        event_id: import("@kbn/es-mappings").KeywordMapping;
        discovery_id: import("@kbn/es-mappings").KeywordMapping;
        discovery_slug: import("@kbn/es-mappings").KeywordMapping;
        rule_names: import("@kbn/es-mappings").KeywordMapping;
    };
};
export type StoredEvent = GetFieldsOf<typeof eventsMappings>;
export type { SigEvent };
export declare const eventsDataStream: DataStreamDefinition<typeof eventsMappings, StoredEvent>;
