import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ConversationActions } from './use_conversation_actions';
interface ConversationContextValue {
    conversationId?: string;
    shouldStickToBottom?: boolean;
    isEmbeddedContext: boolean;
    sessionTag?: string;
    agentId?: string;
    initialMessage?: string;
    autoSendInitialMessage?: boolean;
    resetInitialMessage?: () => void;
    attachments?: AttachmentInput[];
    upsertAttachments?: (attachments: AttachmentInput[]) => void;
    resetAttachments?: () => void;
    removeAttachment?: (attachmentIndex: number) => void;
    browserApiTools?: Array<BrowserApiToolDefinition<any>>;
    setConversationId?: (conversationId?: string) => void;
    setAgentId?: (agentId: string) => void;
    conversationActions: ConversationActions;
}
declare const ConversationContext: import("react").Context<ConversationContextValue | undefined>;
export declare const useConversationContext: () => ConversationContextValue;
export { ConversationContext };
