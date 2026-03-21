import type { AgentAnswerStepConfiguration, AgentResearchStepConfiguration } from '@kbn/agent-builder-common';
export type ResolvedAnswerStepConfiguration = Required<AgentAnswerStepConfiguration>;
export type ResolvedResearchStepConfiguration = Required<AgentResearchStepConfiguration>;
export interface ResolvedConfiguration {
    research: ResolvedResearchStepConfiguration;
    answer: ResolvedAnswerStepConfiguration;
}
