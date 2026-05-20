import type { UseMutationOptions } from '@kbn/react-query';
import type { ExecuteToolResponse } from '../../../../common/http_api/tools';
export interface ExecuteToolParams {
    toolId: string;
    toolParams: Record<string, unknown>;
}
type ExecuteToolMutationOptions = UseMutationOptions<ExecuteToolResponse, Error, ExecuteToolParams>;
export type ExecuteToolSuccessCallback = NonNullable<ExecuteToolMutationOptions['onSuccess']>;
export type ExecuteToolErrorCallback = NonNullable<ExecuteToolMutationOptions['onError']>;
export type ExecuteToolSettledCallback = NonNullable<ExecuteToolMutationOptions['onSettled']>;
export declare const useExecuteTool: ({ onSuccess, onError, onSettled, }?: {
    onSuccess?: ExecuteToolSuccessCallback;
    onError?: ExecuteToolErrorCallback;
    onSettled?: ExecuteToolSettledCallback;
}) => {
    executeTool: import("@kbn/react-query").UseMutateAsyncFunction<ExecuteToolResponse, Error, ExecuteToolParams, unknown>;
    isLoading: boolean;
    error: Error | null;
};
export {};
