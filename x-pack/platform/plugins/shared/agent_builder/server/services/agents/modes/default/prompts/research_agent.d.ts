import type { BaseMessageLike } from '@langchain/core/messages';
import type { PromptFactoryParams, ResearchAgentPromptRuntimeParams } from './types';
type ResearchAgentPromptParams = PromptFactoryParams & ResearchAgentPromptRuntimeParams;
export declare const getResearchAgentPrompt: (params: ResearchAgentPromptParams) => Promise<BaseMessageLike[]>;
export declare const getBaseSystemMessage: ({ configuration: { research: { instructions: customInstructions }, }, conversationTimestamp, processedConversation: { attachmentTypes, versionedAttachmentPresentation }, outputSchema, filestore, experimentalFeatures, }: ResearchAgentPromptParams) => Promise<string>;
export declare const getResearchSystemMessage: ({ configuration: { research: { instructions: customInstructions }, }, conversationTimestamp, processedConversation: { attachmentTypes, versionedAttachmentPresentation }, outputSchema, filestore, experimentalFeatures, }: ResearchAgentPromptParams) => Promise<string>;
export {};
