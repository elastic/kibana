import type { DataStreamDefinition } from '@kbn/data-streams';
import type { Detection } from '@kbn/streams-schema';
import type { GetFieldsOf } from '@kbn/es-mappings';
export declare const DETECTIONS_DATA_STREAM = ".significant_events-detections";
export declare const detectionsMappings: {
    dynamic: false;
    properties: {
        '@timestamp': import("@kbn/es-mappings").DateMapping;
        silent: import("@kbn/es-mappings").BooleanMapping;
        processed: import("@kbn/es-mappings").BooleanMapping;
        detection_id: import("@kbn/es-mappings").KeywordMapping;
        rule_uuid: import("@kbn/es-mappings").KeywordMapping;
        rule_name: import("@kbn/es-mappings").KeywordMapping;
        peak_30m_alert_count: import("@kbn/es-mappings").LongMapping;
        detection_evidence: import("@kbn/es-mappings").ObjectMapping<{
            p_value: {
                type: "double";
            };
        }>;
    };
};
export type StoredDetection = GetFieldsOf<typeof detectionsMappings>;
export type { Detection };
export declare const detectionsDataStream: DataStreamDefinition<typeof detectionsMappings, StoredDetection>;
