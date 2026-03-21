import type { ToolIdMapping } from '@kbn/agent-builder-genai-utils/langchain';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { ProcessedConversationRound } from './prepare_conversation';
import type { ResearchAgentAction } from '../default/actions';
export declare const roundToActions: ({ round, toolIdMapping, }: {
    round: ConversationRound | ProcessedConversationRound;
    toolIdMapping: ToolIdMapping;
}) => ResearchAgentAction[];
