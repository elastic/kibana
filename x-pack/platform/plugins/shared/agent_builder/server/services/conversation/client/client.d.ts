import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import { type UserIdAndName, type Conversation } from '@kbn/agent-builder-common';
import type { ConversationCreateRequest, ConversationUpdateRequest, ConversationListOptions } from './types';
export interface ConversationClient {
    get(conversationId: string): Promise<Conversation>;
    exists(conversationId: string): Promise<boolean>;
    create(conversation: ConversationCreateRequest): Promise<Conversation>;
    update(conversation: ConversationUpdateRequest): Promise<Conversation>;
    list(options?: ConversationListOptions): Promise<ConversationWithoutRounds[]>;
    delete(conversationId: string): Promise<boolean>;
}
export declare const createClient: ({ space, logger, esClient, user, }: {
    space: string;
    logger: Logger;
    esClient: ElasticsearchClient;
    user: UserIdAndName;
}) => ConversationClient;
