import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { type ConversationRound, type ToolSelection, type ToolType } from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/inference-common';
/**
 * Server-side analytics wrapper for Agent Builder telemetry.
 *
 * This service centralizes event type registration and reporting for
 * `AGENT_BUILDER_EVENT_TYPES` so call sites can be kept small, typed, and safe.
 */
export declare class AnalyticsService {
    private readonly analytics;
    private readonly logger;
    constructor(analytics: AnalyticsServiceSetup, logger: Logger);
    /**
     * Register Agent Builder server event types with core analytics.
     */
    registerAgentBuilderEventTypes(): void;
    reportAgentCreated({ agentId, toolSelection, }: {
        agentId: string;
        toolSelection: ToolSelection[];
    }): void;
    reportAgentUpdated({ agentId, toolSelection, }: {
        agentId: string;
        toolSelection: ToolSelection[];
    }): void;
    reportToolCreated({ toolId, toolType }: {
        toolId: string;
        toolType: ToolType | string;
    }): void;
    reportSkillCreated({ skillId }: {
        skillId: string;
    }): void;
    reportSkillUpdated({ skillId }: {
        skillId: string;
    }): void;
    reportSkillDeleted({ skillId }: {
        skillId: string;
    }): void;
    reportRoundComplete({ agentId, conversationId, executionId, modelProvider, round, roundCount, }: {
        agentId: string;
        conversationId?: string;
        executionId?: string;
        modelProvider: ModelProvider;
        round: ConversationRound;
        roundCount: number;
    }): void;
    reportRoundError({ agentId, conversationId, executionId, error, modelProvider, roundId, }: {
        agentId: string;
        conversationId?: string;
        executionId?: string;
        error: unknown;
        modelProvider: ModelProvider;
        roundId?: string;
    }): void;
    reportToolCallSuccess({ agentId, conversationId, executionId, toolId, toolCallId, source, resultTypes, duration, }: {
        agentId?: string;
        conversationId?: string;
        executionId?: string;
        toolId: string;
        toolCallId: string;
        source: string;
        resultTypes: string[];
        duration: number;
    }): void;
    reportToolCallError({ agentId, conversationId, executionId, toolId, toolCallId, source, errorType, errorMessage, duration, }: {
        agentId?: string;
        conversationId?: string;
        executionId?: string;
        toolId: string;
        toolCallId: string;
        source: string;
        errorType: string;
        errorMessage: string;
        duration: number;
    }): void;
}
