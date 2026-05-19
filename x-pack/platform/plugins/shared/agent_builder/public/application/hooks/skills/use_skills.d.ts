import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
export declare const useSkillsService: () => {
    skills: import("@kbn/agent-builder-common").PublicSkillSummary[];
    isLoading: boolean;
    error: unknown;
    isError: boolean;
};
export interface UseSkillProps {
    skillId?: string;
    onLoadingError?: (error: Error) => void;
}
export declare const useSkill: ({ skillId, onLoadingError }: UseSkillProps) => {
    skill: PublicSkillDefinition | undefined;
    isLoading: boolean;
    error: unknown;
    isError: boolean;
};
export interface UseSkillsWithErrorHandlingProps {
    onLoadingError?: (error: Error) => void;
}
export declare const useSkills: ({ onLoadingError }?: UseSkillsWithErrorHandlingProps) => {
    skills: import("@kbn/agent-builder-common").PublicSkillSummary[];
    isLoading: boolean;
    error: unknown;
    isError: boolean;
};
