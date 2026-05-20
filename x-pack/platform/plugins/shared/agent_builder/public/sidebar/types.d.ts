import type { OpenConversationSidebarOptions } from '@kbn/agent-builder-browser';
export type { OpenConversationSidebarOptions };
export interface OpenSidebarInternalOptions extends OpenConversationSidebarOptions {
    /**
     * Conversation id to restore on open. The plugin persists it under the storage key
     * derived from the resolved sidebar config (`sessionTag`/`agentId`)
     */
    conversationId?: string;
}
