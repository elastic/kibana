import type { IndexStorageSettings } from '@kbn/storage-adapter';
export declare const featureStorageSettings: {
    name: string;
    schema: {
        properties: {
            "feature.id": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "feature.uuid": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "stream.name": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "feature.type": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "feature.subtype": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "feature.title": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "feature.description": import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
            "feature.properties": import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
            "feature.confidence": import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty>;
            "feature.evidence": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "feature.evidence_doc_ids": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "feature.status": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "feature.last_seen": import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingDateProperty>;
            "feature.tags": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "feature.meta": import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
            "feature.expires_at": import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingDateProperty>;
            "feature.excluded_at": import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingDateProperty>;
            "feature.run_id": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "feature.filter": import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
            "feature.search_embedding": import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty>;
        };
    };
};
export type FeatureStorageSettings = typeof featureStorageSettings;
export declare function getFeatureStorageSettings(inferenceId?: string): IndexStorageSettings;
