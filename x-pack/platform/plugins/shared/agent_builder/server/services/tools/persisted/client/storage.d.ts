import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { ToolType } from '@kbn/agent-builder-common';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
export declare const toolIndexName: string;
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
            space: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            description: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
            configuration: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                dynamic: false;
                properties: {};
            };
            tags: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            created_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            updated_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
        };
    };
};
export interface ToolProperties<TConfig extends object = Record<string, unknown>> {
    id: string;
    type: ToolType;
    space: string;
    description: string;
    configuration: TConfig;
    tags: string[];
    created_at: string;
    updated_at: string;
}
export type ToolStorageSettings = typeof storageSettings;
export type ToolStorage = StorageIndexAdapter<ToolStorageSettings, ToolProperties>;
export declare const createStorage: ({ logger, esClient, }: {
    logger: Logger;
    esClient: ElasticsearchClient;
}) => ToolStorage;
export {};
