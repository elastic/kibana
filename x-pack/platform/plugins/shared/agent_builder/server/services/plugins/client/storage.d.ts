import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { PluginManifestAuthor, UnmanagedPluginAssets } from '@kbn/agent-builder-common';
export declare const pluginIndexName: string;
declare const storageSettings: {
    name: string;
    schema: {
        properties: {
            id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            name: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            version: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            space: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            description: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
            manifest: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                dynamic: false;
                properties: {};
            };
            source_url: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            skill_ids: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            unmanaged_assets: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                dynamic: false;
                properties: {};
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
export interface PluginManifestProperties {
    author?: PluginManifestAuthor;
    homepage?: string;
    repository?: string;
    license?: string;
    keywords?: string[];
}
export interface PluginProperties {
    id: string;
    name: string;
    version: string;
    space: string;
    description: string;
    manifest: PluginManifestProperties;
    source_url?: string;
    skill_ids: string[];
    unmanaged_assets: UnmanagedPluginAssets;
    created_at: string;
    updated_at: string;
}
export type PluginStorageSettings = typeof storageSettings;
export type PluginStorage = StorageIndexAdapter<PluginStorageSettings, PluginProperties>;
export declare const createStorage: ({ logger, esClient, }: {
    logger: Logger;
    esClient: ElasticsearchClient;
}) => PluginStorage;
export {};
