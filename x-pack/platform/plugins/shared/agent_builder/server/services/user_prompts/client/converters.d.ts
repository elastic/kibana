import type { UserPromptDocument } from './types';
import type { UserPromptProperties } from './storage';
import type { CreateUserPromptPayload as UserPromptCreateParams, UpdateUserPromptPayload as UserPromptUpdateParams, UserPrompt } from '../../../../common/http_api/user_prompts';
export declare const fromEs: (document: UserPromptDocument) => UserPrompt;
export declare const createAttributes: ({ createRequest, space, username, creationDate, }: {
    createRequest: UserPromptCreateParams;
    space: string;
    username: string;
    creationDate?: Date;
}) => UserPromptProperties;
export declare const updateDocument: ({ current, update, username, updateDate, }: {
    current: UserPromptProperties;
    update: UserPromptUpdateParams;
    username: string;
    updateDate?: Date;
}) => UserPromptProperties;
