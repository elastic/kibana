import type { ElasticsearchClient, Logger } from '@kbn/core/server';
/**
 * Elasticsearch mappings for the `.anonymization-profiles` system index.
 * See RFC Section 10.1 for the full schema.
 */
export declare const ANONYMIZATION_PROFILES_MAPPINGS: {
    dynamic: false;
    properties: {
        id: {
            type: "keyword";
        };
        name: {
            type: "text";
            analyzer: string;
            fields: {
                keyword: {
                    type: "keyword";
                };
            };
        };
        description: {
            type: "text";
            analyzer: string;
        };
        target_type: {
            type: "keyword";
        };
        target_id: {
            type: "keyword";
        };
        rules: {
            properties: {
                field_rules: {
                    type: "nested";
                    properties: {
                        field: {
                            type: "keyword";
                        };
                        allowed: {
                            type: "boolean";
                        };
                        anonymized: {
                            type: "boolean";
                        };
                        entity_class: {
                            type: "keyword";
                        };
                    };
                };
                regex_rules: {
                    type: "nested";
                    properties: {
                        id: {
                            type: "keyword";
                        };
                        type: {
                            type: "keyword";
                        };
                        entity_class: {
                            type: "keyword";
                        };
                        pattern: {
                            type: "text";
                            analyzer: string;
                        };
                        enabled: {
                            type: "boolean";
                        };
                    };
                };
                ner_rules: {
                    type: "nested";
                    properties: {
                        id: {
                            type: "keyword";
                        };
                        type: {
                            type: "keyword";
                        };
                        model_id: {
                            type: "keyword";
                        };
                        allowed_entity_classes: {
                            type: "keyword";
                        };
                        enabled: {
                            type: "boolean";
                        };
                    };
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
        updated_by: {
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
export declare const ANONYMIZATION_PROFILES_SETTINGS: {
    hidden: boolean;
    auto_expand_replicas: string;
    number_of_shards: number;
    'index.mapping.ignore_malformed': boolean;
    'index.mapping.total_fields.limit': number;
};
/**
 * Ensures the `.anonymization-profiles` system index exists.
 * Idempotent: if the index already exists, this is a no-op.
 */
export declare const ensureProfilesIndex: ({ esClient, logger, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
}) => Promise<void>;
