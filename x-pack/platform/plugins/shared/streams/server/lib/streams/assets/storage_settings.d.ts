import type { IndexStorageSettings } from '@kbn/storage-adapter';
/**
 * Storage settings for Significant Events queries.
 * Note: The index name ".kibana_streams_assets" is kept for backwards compatibility,
 * but this index is only used to store query assets (Significant Events queries linked to streams).
 *
 * The base settings use `semantic_text()` with no explicit `inference_id`,
 * which causes ES to use the cluster default at index-creation time.
 * For existing indices that already have a `semantic_text` mapping with a
 * specific `inference_id`, use `getQueryStorageSettings(existingId)` so that
 * the schema hash and putMapping payload stay compatible with the index.
 * Sending a bare `semantic_text()` to putMapping on such an index would resolve
 * to the cluster default (potentially a different model) and fail with
 * illegal_argument_exception when the models are incompatible.
 */
export declare const queryStorageSettings: {
    name: string;
    schema: {
        properties: {
            "asset.uuid": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "asset.id": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "asset.type": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "stream.name": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "query.kql.query": import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty>;
            "query.esql.query": import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingMatchOnlyTextProperty>;
            "query.title": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "query.description": import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
            "query.severity_score": import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty>;
            "query.type": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "query.features": import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                properties: {
                    id: {
                        type: "keyword";
                    };
                    run_id: {
                        type: "keyword";
                    };
                };
            };
            rule_backed: import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty>;
            rule_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "query.search_embedding": import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty>;
            experimental: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
        };
    };
};
export type QueryStorageSettings = typeof queryStorageSettings;
export declare function getQueryStorageSettings(inferenceId?: string): IndexStorageSettings;
