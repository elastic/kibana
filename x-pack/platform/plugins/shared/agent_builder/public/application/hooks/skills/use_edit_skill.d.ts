import type { UseMutationOptions } from '@kbn/react-query';
import type { UpdateSkillPayload, UpdateSkillResponse } from '../../../../common/http_api/skills';
interface EditSkillMutationVariables {
    skillId: string;
    skill: UpdateSkillPayload;
}
type EditSkillMutationOptions = UseMutationOptions<UpdateSkillResponse, Error, EditSkillMutationVariables>;
export type EditSkillSuccessCallback = NonNullable<EditSkillMutationOptions['onSuccess']>;
export type EditSkillErrorCallback = NonNullable<EditSkillMutationOptions['onError']>;
export interface UseEditSkillServiceProps {
    onSuccess?: EditSkillSuccessCallback;
    onError?: EditSkillErrorCallback;
}
export declare const useEditSkillService: ({ onSuccess, onError }?: UseEditSkillServiceProps) => {
    updateSkillSync: import("@kbn/react-query").UseMutateFunction<import("@kbn/agent-builder-common").PublicSkillDefinition, Error, EditSkillMutationVariables, unknown>;
    updateSkill: import("@kbn/react-query").UseMutateAsyncFunction<import("@kbn/agent-builder-common").PublicSkillDefinition, Error, EditSkillMutationVariables, unknown>;
    isLoading: boolean;
};
export interface UseEditSkillProps {
    skillId: string;
    onSuccess?: EditSkillSuccessCallback;
    onError?: EditSkillErrorCallback;
    onLoadingError?: (error: Error) => void;
}
export declare const useEditSkill: ({ skillId, onSuccess, onError, onLoadingError, }: UseEditSkillProps) => {
    skill: import("@kbn/agent-builder-common").PublicSkillDefinition | undefined;
    isLoading: boolean;
    isSubmitting: boolean;
    editSkill: (skillData: UpdateSkillPayload) => Promise<import("@kbn/agent-builder-common").PublicSkillDefinition>;
};
export {};
