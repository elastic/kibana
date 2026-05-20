import type { IHttpFetchError } from '@kbn/core/public';
interface DeleteCloudConnectorResponse {
    id: string;
}
export declare const useDeleteCloudConnector: (cloudConnectorId: string, onSuccess?: (response: DeleteCloudConnectorResponse) => void, onError?: (error: Error) => void) => import("@kbn/react-query").UseMutationResult<DeleteCloudConnectorResponse, IHttpFetchError<{
    message?: string;
}>, {
    force?: boolean;
} | undefined, unknown>;
export {};
