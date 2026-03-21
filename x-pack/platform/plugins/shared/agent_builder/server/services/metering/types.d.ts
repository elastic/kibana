import type { ModelProvider } from '@kbn/inference-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
export interface AgentExecutionUsage {
    agentId: string;
    executionId: string;
    conversationId?: string;
    modelProvider: ModelProvider;
    round: ConversationRound;
    roundCount: number;
}
