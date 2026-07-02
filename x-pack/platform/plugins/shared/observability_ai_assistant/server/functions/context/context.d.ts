import type { FunctionRegistrationParameters } from '..';
import type { Message } from '../../../common/types';
export declare function registerContextFunction({ client, functions, resources, scopes, isKnowledgeBaseReady, }: FunctionRegistrationParameters & {
    isKnowledgeBaseReady: boolean;
}): void;
export declare function removeContextToolRequest(messages: Message[]): Message[];
