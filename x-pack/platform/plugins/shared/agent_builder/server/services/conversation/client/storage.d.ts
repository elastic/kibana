import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { ConversationInternalState } from '@kbn/agent-builder-common/chat';
import type { PersistentConversationRound } from './types';
export declare const conversationIndexName: string;
declare const storageSettings: {
    name: string;
    schema: {
        properties: {
            user_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            user_name: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            agent_id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            space: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            title: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
            created_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            updated_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            conversation_rounds: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                dynamic: false;
                properties: {};
            };
            attachments: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                dynamic: false;
                properties: {};
            };
            state: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                dynamic: false;
                properties: {};
            };
        };
    };
};
export interface ConversationProperties {
    user_id?: string;
    user_name: string;
    agent_id: string;
    space: string;
    title: string;
    created_at: string;
    updated_at: string;
    conversation_rounds: PersistentConversationRound[];
    attachments?: VersionedAttachment[];
    state?: ConversationInternalState;
    rounds?: PersistentConversationRound[];
}
export type ConversationStorageSettings = typeof storageSettings;
export type ConversationStorage = StorageIndexAdapter<ConversationStorageSettings, ConversationProperties>;
export declare const createStorage: ({ logger, esClient, }: {
    logger: Logger;
    esClient: ElasticsearchClient;
}) => ConversationStorage;
export {};
