import type { Conversation, ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
export declare const createNewConversation: ({ id, agentId, }: {
    id: string;
    agentId: string;
}) => Conversation;
export declare const pendingRoundId = "__pending__";
export declare const createNewRound: ({ userMessage, attachments, roundId, steps, }: {
    userMessage: string;
    attachments?: Attachment[];
    roundId?: string;
    steps?: ConversationRoundStep[];
}) => ConversationRound;
