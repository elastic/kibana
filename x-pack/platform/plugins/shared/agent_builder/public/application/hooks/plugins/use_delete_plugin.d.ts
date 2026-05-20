import type { UseMutationOptions } from '@kbn/react-query';
import type { AgentRef } from '../../../../common/http_api/tools';
import type { DeletePluginResponse } from '../../../../common/http_api/plugins';
export interface PluginUsedByAgents {
    pluginId: string;
    pluginName: string;
    agents: AgentRef[];
}
interface DeletePluginMutationVariables {
    pluginId: string;
    pluginName: string;
    force?: boolean;
}
type DeletePluginMutationOptions = UseMutationOptions<DeletePluginResponse, Error, DeletePluginMutationVariables>;
type DeletePluginSuccessCallback = NonNullable<DeletePluginMutationOptions['onSuccess']>;
type DeletePluginErrorCallback = NonNullable<DeletePluginMutationOptions['onError']>;
export declare const useDeletePluginService: ({ onSuccess, onError, }?: {
    onSuccess?: DeletePluginSuccessCallback;
    onError?: DeletePluginErrorCallback;
}) => {
    deletePluginSync: import("@kbn/react-query").UseMutateFunction<DeletePluginResponse, Error, DeletePluginMutationVariables, unknown>;
    deletePlugin: import("@kbn/react-query").UseMutateAsyncFunction<DeletePluginResponse, Error, DeletePluginMutationVariables, unknown>;
    isLoading: boolean;
};
export declare const useDeletePlugin: ({ onSuccess, onError, }?: {
    onSuccess?: DeletePluginSuccessCallback;
    onError?: DeletePluginErrorCallback;
}) => {
    isOpen: boolean;
    isLoading: boolean;
    pluginId: string | null;
    pluginName: string | null;
    deletePlugin: (pluginId: string, pluginName: string, { onConfirm, onCancel }?: {
        onConfirm?: () => void;
        onCancel?: () => void;
    }) => void;
    confirmDelete: () => Promise<void>;
    cancelDelete: () => void;
    usedByAgents: PluginUsedByAgents | null;
    isForceConfirmModalOpen: boolean;
    confirmForceDelete: () => Promise<void>;
    cancelForceDelete: () => void;
};
export {};
