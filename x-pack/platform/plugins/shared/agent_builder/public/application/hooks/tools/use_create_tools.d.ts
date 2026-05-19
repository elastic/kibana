import type { UseMutationOptions } from '@kbn/react-query';
import type { CreateToolPayload, CreateToolResponse } from '../../../../common/http_api/tools';
type CreateToolMutationOptions = UseMutationOptions<CreateToolResponse, Error, CreateToolPayload>;
export type CreateToolSuccessCallback = NonNullable<CreateToolMutationOptions['onSuccess']>;
export type CreateToolErrorCallback = NonNullable<CreateToolMutationOptions['onError']>;
export interface UseCreateToolServiceProps {
    onSuccess?: CreateToolSuccessCallback;
    onError?: CreateToolErrorCallback;
}
export declare const useCreateToolService: ({ onSuccess, onError }?: UseCreateToolServiceProps) => {
    createToolSync: import("@kbn/react-query").UseMutateFunction<CreateToolResponse, Error, CreateToolPayload, unknown>;
    createTool: import("@kbn/react-query").UseMutateAsyncFunction<CreateToolResponse, Error, CreateToolPayload, unknown>;
    isLoading: boolean;
};
export interface UseCreateToolProps {
    sourceToolId?: string;
    onSuccess?: CreateToolSuccessCallback;
    onError?: CreateToolErrorCallback;
    onLoadingError?: (error: Error) => void;
}
export declare const useCreateTool: ({ sourceToolId, onSuccess, onError, onLoadingError, }?: UseCreateToolProps) => {
    sourceTool: import("@kbn/agent-builder-common").ToolDefinitionWithSchema<import("@kbn/agent-builder-common").ToolType, Record<string, unknown>> | undefined;
    isLoading: boolean;
    isSubmitting: boolean;
    createTool: (tool: CreateToolPayload) => Promise<CreateToolResponse>;
};
export {};
