import type { Capabilities, HttpStart } from '@kbn/core/public';
import type { AgentBuilderAnnouncementVariant } from '@kbn/agent-builder-browser';
export declare function computeAnnouncementVariant(hasUsedAiAssistant: boolean, canRevertToAssistant: boolean): AgentBuilderAnnouncementVariant;
export interface UseAiAssistantPriorUsageResult {
    hasUsedAiAssistant: boolean;
    isReady: boolean;
}
export declare function useAiAssistantPriorUsage(http: HttpStart, capabilities: Capabilities): UseAiAssistantPriorUsageResult;
