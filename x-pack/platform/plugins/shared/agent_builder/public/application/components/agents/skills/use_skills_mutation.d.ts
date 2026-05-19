import type { AgentDefinition, PublicSkillDefinition, PublicSkillSummary } from '@kbn/agent-builder-common';
export declare const useSkillsMutation: ({ agent }: {
    agent: AgentDefinition | null;
}) => {
    handleAddSkill: (skill: PublicSkillSummary | PublicSkillDefinition, { onSuccess }?: {
        onSuccess?: (skillId: string) => void;
    }) => void;
    handleRemoveSkill: (skill: PublicSkillSummary) => void;
};
