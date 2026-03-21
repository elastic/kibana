import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CreateUserPromptPayload as UserPromptCreateParams, UpdateUserPromptPayload as UserPromptUpdateParams, UserPrompt } from '../../../../common/http_api/user_prompts';
import type { FindUserPromptsParams, FindUserPromptsResult } from './types';
/**
 * Client for persisted user prompt definitions.
 */
export interface UserPromptClient {
    get(promptId: string): Promise<UserPrompt>;
    find(params?: FindUserPromptsParams): Promise<FindUserPromptsResult>;
    create(prompt: UserPromptCreateParams): Promise<UserPrompt>;
    update(promptId: string, updates: UserPromptUpdateParams): Promise<UserPrompt>;
    delete(promptId: string): Promise<boolean>;
}
export declare const createClient: ({ space, username, logger, esClient, }: {
    space: string;
    username: string;
    logger: Logger;
    esClient: ElasticsearchClient;
}) => UserPromptClient;
