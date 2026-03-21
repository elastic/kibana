import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { AgentExecutionParams, ExecutionStatus, SerializedExecutionError } from '../types';
export declare const agentExecutionIndexName: string;
declare const storageSettings: {
    name: string;
    schema: {
        properties: {
            execution_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            '@timestamp': import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            status: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            agent_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            space_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            agent_params: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                dynamic: false;
                properties: {};
            };
            error: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                dynamic: false;
                properties: {
                    code: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                        ignore_above: number;
                    };
                    message: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
                };
            };
            event_count: import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty>;
            events: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                dynamic: false;
                properties: {};
            };
            metadata: import("@elastic/elasticsearch/lib/api/types").MappingFlattenedProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingFlattenedProperty>;
        };
    };
};
export interface AgentExecutionProperties {
    execution_id: string;
    '@timestamp': string;
    status: ExecutionStatus;
    agent_id: string;
    space_id: string;
    agent_params: AgentExecutionParams;
    error?: SerializedExecutionError;
    event_count?: number;
    events?: ChatEvent[];
    metadata?: Record<string, string>;
}
export type AgentExecutionStorageSettings = typeof storageSettings;
export type AgentExecutionStorage = StorageIndexAdapter<AgentExecutionStorageSettings, AgentExecutionProperties>;
export declare const createStorage: ({ logger, esClient, }: {
    logger: Logger;
    esClient: ElasticsearchClient;
}) => AgentExecutionStorage;
export {};
