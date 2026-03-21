import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { ToolHealthStatus } from '../../../../../common/http_api/tools';
export declare const toolHealthIndexName: string;
export type { ToolHealthStatus };
declare const storageSettings: {
    name: string;
    schema: {
        properties: {
            tool_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            space: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            status: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            last_check: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            error_message: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
            consecutive_failures: import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty>;
            updated_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
        };
    };
};
export interface ToolHealthProperties {
    tool_id: string;
    space: string;
    status: ToolHealthStatus;
    last_check: string;
    error_message?: string;
    consecutive_failures: number;
    updated_at: string;
}
export type ToolHealthStorageSettings = typeof storageSettings;
export type ToolHealthStorage = StorageIndexAdapter<ToolHealthStorageSettings, ToolHealthProperties>;
export declare const createStorage: ({ logger, esClient, }: {
    logger: Logger;
    esClient: ElasticsearchClient;
}) => ToolHealthStorage;
