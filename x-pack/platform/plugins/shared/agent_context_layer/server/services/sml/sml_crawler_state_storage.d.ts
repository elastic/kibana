import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { SmlCrawlerStateDocument } from './types';
export declare const smlCrawlerStateIndexName: string;
declare const storageSettings: {
    name: string;
    schema: {
        properties: {
            origin_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            type_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            spaces: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            created_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            updated_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            update_action: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            last_crawled_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
        };
    };
};
export type SmlCrawlerStateStorageSettings = typeof storageSettings;
export type SmlCrawlerStateStorage = StorageIndexAdapter<SmlCrawlerStateStorageSettings, SmlCrawlerStateDocument>;
export declare const createSmlCrawlerStateStorage: ({ logger, esClient, }: {
    logger: Logger;
    esClient: ElasticsearchClient;
}) => SmlCrawlerStateStorage;
export {};
