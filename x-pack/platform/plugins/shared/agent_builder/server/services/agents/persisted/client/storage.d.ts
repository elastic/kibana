import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AgentType, AgentVisibility, ToolSelection } from '@kbn/agent-builder-common';
export declare const agentsIndexName: string;
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
            type: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            space: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            description: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
            labels: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            avatar_color: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            avatar_symbol: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            visibility: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            created_by_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            created_by_name: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            config: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                properties: {
                    workflow_ids: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                        ignore_above: number;
                    };
                };
                dynamic: false;
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
export interface AgentProperties {
    id: string;
    name: string;
    type: AgentType;
    space: string;
    description: string;
    labels?: string[];
    avatar_color?: string;
    avatar_symbol?: string;
    visibility?: AgentVisibility;
    created_by_id?: string;
    created_by_name?: string;
    config: AgentConfigurationProperties;
    created_at: string;
    updated_at: string;
    configuration?: AgentConfigurationProperties;
}
export interface AgentConfigurationProperties {
    instructions?: string;
    tools: ToolSelection[];
    skill_ids?: string[];
    enable_elastic_capabilities?: boolean;
    workflow_ids?: string[];
}
export type AgentProfileStorageSettings = typeof storageSettings;
export type AgentProfileStorage = StorageIndexAdapter<AgentProfileStorageSettings, AgentProperties>;
export declare const createStorage: ({ logger, esClient, }: {
    logger: Logger;
    esClient: ElasticsearchClient;
}) => AgentProfileStorage;
export {};
