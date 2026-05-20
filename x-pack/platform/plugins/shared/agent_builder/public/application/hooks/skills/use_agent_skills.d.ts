export declare const useAgentSkills: ({ agentId }?: {
    agentId?: string;
}) => {
    skills: import("@kbn/agent-builder-common").PublicSkillSummary[];
    isLoading: boolean;
    error: unknown;
    isError: boolean;
};
