import type { Observable } from 'rxjs';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { Conversation, ConverseInput } from '@kbn/agent-builder-common';
/**
 * Generates a title for a conversation
 */
export declare const generateTitle: ({ nextInput, conversation, chatModel, }: {
    nextInput: ConverseInput;
    conversation: Conversation;
    chatModel: InferenceChatModel;
}) => Observable<string>;
