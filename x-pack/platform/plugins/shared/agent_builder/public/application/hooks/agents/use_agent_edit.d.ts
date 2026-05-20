import { type AgentDefinition } from '@kbn/agent-builder-common';
export type AgentEditState = Omit<AgentDefinition, 'type' | 'readonly'>;
export declare function useAgentEdit({ editingAgentId, onSaveSuccess, onSaveError, }: {
    editingAgentId?: string;
    onSaveSuccess: (agent: AgentDefinition) => void;
    onSaveError: (err: Error) => void;
}): {
    state: AgentEditState;
    isLoading: boolean;
    isSubmitting: boolean;
    submit: (data: AgentEditState) => Promise<void>;
    tools: import("@kbn/agent-builder-common").ToolDefinition<import("@kbn/agent-builder-common").ToolType, Record<string, unknown>>[];
    skills: import("@kbn/agent-builder-common").PublicSkillSummary[];
    plugins: import("@kbn/agent-builder-common").PluginDefinition[];
    error: unknown;
};
