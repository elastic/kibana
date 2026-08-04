import type { ElasticsearchClient, Logger } from '@kbn/core/server';
/**
 * System index name for anonymization replacements.
 * Uses `.kibana-` prefix so that `kibana_system` role has access.
 */
export declare const ANONYMIZATION_REPLACEMENTS_INDEX = ".kibana-anonymization-replacements";
/**
 * Elasticsearch mappings for the `.kibana-anonymization-replacements` system index.
 * See RFC Section 10.2 for the full schema.
 */
export declare const ANONYMIZATION_REPLACEMENTS_MAPPINGS: {
    dynamic: false;
    properties: {
        id: {
            type: "keyword";
        };
        replacements: {
            type: "nested";
            properties: {
                anonymized: {
                    type: "keyword";
                };
                original: {
                    type: "keyword";
                    index: false;
                };
                original_encrypted: {
                    type: "keyword";
                    index: false;
                };
            };
        };
        created_at: {
            type: "date";
        };
        updated_at: {
            type: "date";
        };
        created_by: {
            type: "keyword";
        };
        namespace: {
            type: "keyword";
        };
    };
    _meta: {
        managed: boolean;
    };
};
export declare const ANONYMIZATION_REPLACEMENTS_SETTINGS: {
    hidden: boolean;
    auto_expand_replicas: string;
    number_of_shards: number;
    'index.mapping.ignore_malformed': boolean;
    'index.mapping.total_fields.limit': number;
};
/**
 * Ensures the `.kibana-anonymization-replacements` system index exists.
 * Idempotent: if the index already exists, this is a no-op.
 */
export declare const ensureReplacementsIndex: ({ esClient, logger, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
}) => Promise<void>;
