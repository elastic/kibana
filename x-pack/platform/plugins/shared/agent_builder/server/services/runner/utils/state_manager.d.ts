import type { Conversation } from '@kbn/agent-builder-common';
import type { ConversationStateManager } from '@kbn/agent-builder-server/runner';
export declare const createConversationStateManager: (conversation?: Conversation | undefined) => ConversationStateManager;
