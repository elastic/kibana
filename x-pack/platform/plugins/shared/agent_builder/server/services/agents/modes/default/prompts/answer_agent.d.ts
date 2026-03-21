import type { BaseMessageLike } from '@langchain/core/messages';
import type { PromptFactoryParams, AnswerAgentPromptRuntimeParams } from './types';
type AnswerAgentPromptParams = PromptFactoryParams & AnswerAgentPromptRuntimeParams;
export declare const getAnswerAgentPrompt: (params: AnswerAgentPromptParams) => Promise<BaseMessageLike[]>;
export declare const getAnswerSystemMessage: ({ configuration: { answer: { instructions: customInstructions }, }, conversationTimestamp, capabilities, processedConversation: { attachmentTypes, versionedAttachmentPresentation }, }: AnswerAgentPromptParams) => string;
export declare const getStructuredAnswerPrompt: (params: AnswerAgentPromptParams) => Promise<BaseMessageLike[]>;
export {};
