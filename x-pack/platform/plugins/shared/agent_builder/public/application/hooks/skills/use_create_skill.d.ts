import type { UseMutationOptions } from '@kbn/react-query';
import type { CreateSkillPayload, CreateSkillResponse } from '../../../../common/http_api/skills';
type CreateSkillMutationOptions = UseMutationOptions<CreateSkillResponse, Error, CreateSkillPayload>;
export type CreateSkillSuccessCallback = NonNullable<CreateSkillMutationOptions['onSuccess']>;
export type CreateSkillErrorCallback = NonNullable<CreateSkillMutationOptions['onError']>;
export interface UseCreateSkillServiceProps {
    onSuccess?: CreateSkillSuccessCallback;
    onError?: CreateSkillErrorCallback;
}
export declare const useCreateSkillService: ({ onSuccess, onError }?: UseCreateSkillServiceProps) => {
    createSkillSync: import("@kbn/react-query").UseMutateFunction<import("@kbn/agent-builder-common").PublicSkillDefinition, Error, import("@kbn/agent-builder-common").PersistedSkillCreateRequest, unknown>;
    createSkill: import("@kbn/react-query").UseMutateAsyncFunction<import("@kbn/agent-builder-common").PublicSkillDefinition, Error, import("@kbn/agent-builder-common").PersistedSkillCreateRequest, unknown>;
    isLoading: boolean;
};
export interface UseCreateSkillProps {
    onSuccess?: CreateSkillSuccessCallback;
    onError?: CreateSkillErrorCallback;
}
export declare const useCreateSkill: ({ onSuccess, onError }?: UseCreateSkillProps) => {
    isSubmitting: boolean;
    createSkill: (skill: CreateSkillPayload) => Promise<import("@kbn/agent-builder-common").PublicSkillDefinition>;
};
export {};
