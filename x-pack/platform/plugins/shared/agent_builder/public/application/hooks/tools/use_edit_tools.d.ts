import type { UseMutationOptions } from '@kbn/react-query';
import type { UpdateToolPayload, UpdateToolResponse } from '../../../../common/http_api/tools';
interface EditToolMutationVariables {
    toolId: string;
    tool: UpdateToolPayload;
}
type EditToolMutationOptions = UseMutationOptions<UpdateToolResponse, Error, EditToolMutationVariables>;
export type EditToolSuccessCallback = NonNullable<EditToolMutationOptions['onSuccess']>;
export type EditToolErrorCallback = NonNullable<EditToolMutationOptions['onError']>;
export interface UseEditToolServiceProps {
    onSuccess?: EditToolSuccessCallback;
    onError?: EditToolErrorCallback;
}
export declare const useEditToolService: ({ onSuccess, onError }?: UseEditToolServiceProps) => {
    updateToolSync: import("@kbn/react-query").UseMutateFunction<UpdateToolResponse, Error, EditToolMutationVariables, unknown>;
    updateTool: import("@kbn/react-query").UseMutateAsyncFunction<UpdateToolResponse, Error, EditToolMutationVariables, unknown>;
    isLoading: boolean;
};
export interface UseEditToolProps {
    toolId: string;
    onSuccess?: EditToolSuccessCallback;
    onError?: EditToolErrorCallback;
    onLoadingError?: (error: Error) => void;
}
export declare const useEditTool: ({ toolId, onSuccess, onError, onLoadingError }: UseEditToolProps) => {
    tool: import("@kbn/agent-builder-common").ToolDefinitionWithSchema<import("@kbn/agent-builder-common").ToolType, Record<string, unknown>> | undefined;
    isLoading: boolean;
    isSubmitting: boolean;
    editTool: (toolData: UpdateToolPayload) => Promise<UpdateToolResponse>;
};
export {};
