import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { SmlDocument } from './types';
export declare const smlIndexName: string;
declare const storageSettings: {
    name: string;
    schema: {
        properties: {
            id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            type: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            title: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
            origin_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            content: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
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
export type SmlStorageSettings = typeof storageSettings;
export type SmlStorage = StorageIndexAdapter<SmlStorageSettings, SmlDocument>;
export declare const createSmlStorage: ({ logger, esClient, }: {
    logger: Logger;
    esClient: ElasticsearchClient;
}) => SmlStorage;
export {};
