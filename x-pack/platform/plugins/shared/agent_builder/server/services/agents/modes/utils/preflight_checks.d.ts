import type { Conversation, ConverseInput, ConversationAction } from '@kbn/agent-builder-common';
export declare const ensureValidInput: ({ input, conversation, action, }: {
    input: ConverseInput;
    conversation?: Conversation;
    action?: ConversationAction;
}) => void;
