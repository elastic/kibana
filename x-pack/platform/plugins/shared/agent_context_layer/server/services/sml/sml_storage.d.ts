import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { SmlDocument } from './types';
export declare const smlIndexName: string;
export declare const storageSettings: {
    name: string;
    schema: {
        properties: {
            id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            type: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & {
                fields: {
                    autocomplete: import("@elastic/elasticsearch/lib/api/types").MappingSearchAsYouTypeProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingSearchAsYouTypeProperty>;
                };
            };
            title: import("@elastic/elasticsearch/lib/api/types").MappingSearchAsYouTypeProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingSearchAsYouTypeProperty>;
            origin_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            content: import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty>;
            description: import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty>;
            user_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            references: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            created_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            updated_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            spaces: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            permissions: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
        };
    };
};
/**
 * Elasticsearch `mappings` block for the SML data index (e.g. integration tests, tooling).
 * Field definitions match `smlStorageSchemaProperties` / `storageSettings`.
 */
export declare const smlElasticsearchIndexMappings: {
    dynamic: "strict";
    properties: {
        id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
            ignore_above: number;
        };
        type: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
            ignore_above: number;
        } & {
            fields: {
                autocomplete: import("@elastic/elasticsearch/lib/api/types").MappingSearchAsYouTypeProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingSearchAsYouTypeProperty>;
            };
        };
        title: import("@elastic/elasticsearch/lib/api/types").MappingSearchAsYouTypeProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingSearchAsYouTypeProperty>;
        origin_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
            ignore_above: number;
        };
        content: import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty>;
        description: import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingSemanticTextProperty>;
        user_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
            ignore_above: number;
        };
        references: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
            ignore_above: number;
        };
        created_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
            format: string;
        };
        updated_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
            format: string;
        };
        spaces: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
            ignore_above: number;
        };
        permissions: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
            ignore_above: number;
        };
    };
};
export type SmlStorageSettings = typeof storageSettings;
export type SmlStorage = StorageIndexAdapter<SmlStorageSettings, SmlDocument>;
export declare const createSmlStorage: ({ logger, esClient, }: {
    logger: Logger;
    esClient: ElasticsearchClient;
}) => SmlStorage;
