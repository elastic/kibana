import type { UseMutationOptions } from '@kbn/react-query';
import type { AgentRef, BulkDeleteToolResponse, DeleteToolResponse } from '../../../../common/http_api/tools';
export interface ToolUsedByAgents {
    toolId: string;
    agents: AgentRef[];
}
interface DeleteToolMutationVariables {
    toolId: string;
    force?: boolean;
}
type DeleteToolMutationOptions = UseMutationOptions<DeleteToolResponse, Error, DeleteToolMutationVariables>;
type DeleteToolSuccessCallback = NonNullable<DeleteToolMutationOptions['onSuccess']>;
type DeleteToolErrorCallback = NonNullable<DeleteToolMutationOptions['onError']>;
interface DeleteToolsMutationVariables {
    toolIds: string[];
}
type DeleteToolsMutationOptions = UseMutationOptions<BulkDeleteToolResponse, Error, DeleteToolsMutationVariables>;
type DeleteToolsSuccessCallback = NonNullable<DeleteToolsMutationOptions['onSuccess']>;
type DeleteToolsErrorCallback = NonNullable<DeleteToolsMutationOptions['onError']>;
export declare const useDeleteToolService: ({ onSuccess, onError, }?: {
    onSuccess?: DeleteToolSuccessCallback;
    onError?: DeleteToolErrorCallback;
}) => {
    deleteToolSync: import("@kbn/react-query").UseMutateFunction<DeleteToolResponse, Error, DeleteToolMutationVariables, unknown>;
    deleteTool: import("@kbn/react-query").UseMutateAsyncFunction<DeleteToolResponse, Error, DeleteToolMutationVariables, unknown>;
    isLoading: boolean;
};
export declare const useDeleteToolsService: ({ onSuccess, onError, }?: {
    onSuccess?: DeleteToolsSuccessCallback;
    onError?: DeleteToolsErrorCallback;
}) => {
    deleteToolsSync: import("@kbn/react-query").UseMutateFunction<BulkDeleteToolResponse, Error, DeleteToolsMutationVariables, unknown>;
    deleteTools: import("@kbn/react-query").UseMutateAsyncFunction<BulkDeleteToolResponse, Error, DeleteToolsMutationVariables, unknown>;
    isLoading: boolean;
};
export declare const useDeleteTool: ({ onSuccess, onError, }?: {
    onSuccess?: DeleteToolSuccessCallback;
    onError?: DeleteToolErrorCallback;
}) => {
    isOpen: boolean;
    isLoading: boolean;
    toolId: string | null;
    deleteTool: (toolId: string, { onConfirm, onCancel }?: {
        onConfirm?: () => void;
        onCancel?: () => void;
    }) => void;
    confirmDelete: () => Promise<void>;
    cancelDelete: () => void;
    usedByAgents: ToolUsedByAgents | null;
    isForceConfirmModalOpen: boolean;
    confirmForceDelete: () => Promise<void>;
    cancelForceDelete: () => void;
};
export declare const useDeleteTools: ({ onSuccess, onError, }?: {
    onSuccess?: DeleteToolsSuccessCallback;
    onError?: DeleteToolsErrorCallback;
}) => {
    isOpen: boolean;
    isLoading: boolean;
    toolIds: string[];
    deleteTools: (toolIds: string[]) => void;
    confirmDelete: () => Promise<BulkDeleteToolResponse>;
    cancelDelete: () => void;
};
export {};
