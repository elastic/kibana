import type { UseMutationOptions } from '@kbn/react-query';
import type { AgentRef, DeleteSkillResponse } from '../../../../common/http_api/skills';
export interface SkillUsedByAgents {
    skillId: string;
    agents: AgentRef[];
}
interface DeleteSkillMutationVariables {
    skillId: string;
    force?: boolean;
}
type DeleteSkillMutationOptions = UseMutationOptions<DeleteSkillResponse, Error, DeleteSkillMutationVariables>;
type DeleteSkillSuccessCallback = NonNullable<DeleteSkillMutationOptions['onSuccess']>;
type DeleteSkillErrorCallback = NonNullable<DeleteSkillMutationOptions['onError']>;
export declare const useDeleteSkillService: ({ onSuccess, onError, }?: {
    onSuccess?: DeleteSkillSuccessCallback;
    onError?: DeleteSkillErrorCallback;
}) => {
    deleteSkillSync: import("@kbn/react-query").UseMutateFunction<DeleteSkillResponse, Error, DeleteSkillMutationVariables, unknown>;
    deleteSkill: import("@kbn/react-query").UseMutateAsyncFunction<DeleteSkillResponse, Error, DeleteSkillMutationVariables, unknown>;
    isLoading: boolean;
};
export declare const useDeleteSkill: ({ onSuccess, onError, }?: {
    onSuccess?: DeleteSkillSuccessCallback;
    onError?: DeleteSkillErrorCallback;
}) => {
    isOpen: boolean;
    isLoading: boolean;
    skillId: string | null;
    deleteSkill: (skillId: string, { onConfirm, onCancel }?: {
        onConfirm?: () => void;
        onCancel?: () => void;
    }) => void;
    confirmDelete: () => Promise<void>;
    cancelDelete: () => void;
    usedByAgents: SkillUsedByAgents | null;
    isForceConfirmModalOpen: boolean;
    confirmForceDelete: () => Promise<void>;
    cancelForceDelete: () => void;
};
export {};
