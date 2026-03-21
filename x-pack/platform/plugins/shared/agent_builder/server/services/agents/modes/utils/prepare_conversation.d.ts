import type { ConversationAction, ConversationRound, ConverseInput } from '@kbn/agent-builder-common';
import type { ProcessedAttachment, ProcessedRoundInput } from '@kbn/agent-builder-server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AgentHandlerContext } from '@kbn/agent-builder-server/agents';
import { type AttachmentPresentation } from './attachment_presentation';
export interface ProcessedAttachmentType {
    type: string;
    description?: string;
}
export type ProcessedConversationRound = Omit<ConversationRound, 'input'> & {
    input: ProcessedRoundInput;
};
export interface ProcessedConversation {
    previousRounds: ProcessedConversationRound[];
    nextInput: ProcessedRoundInput;
    attachmentTypes: ProcessedAttachmentType[];
    attachments: ProcessedAttachment[];
    attachmentStateManager: AttachmentStateManager;
    /** Presentation configuration for versioned attachments (inline vs summary mode) */
    versionedAttachmentPresentation?: AttachmentPresentation;
}
export declare const prepareConversation: ({ previousRounds, nextInput, context, action, }: {
    previousRounds: ConversationRound[];
    nextInput: ConverseInput;
    context: AgentHandlerContext;
    action?: ConversationAction;
}) => Promise<ProcessedConversation>;
