import type { IHttpFetchError } from '@kbn/core/public';
interface UpdateCloudConnectorRequest {
    name?: string;
}
interface CloudConnector {
    id: string;
    name: string;
    namespace?: string;
    cloudProvider: string;
    vars: Record<string, unknown>;
    packagePolicyCount: number;
    created_at: string;
    updated_at: string;
}
export declare const useUpdateCloudConnector: (cloudConnectorId: string, onSuccess?: (connector: CloudConnector) => void, onError?: (error: Error) => void) => import("@kbn/react-query").UseMutationResult<CloudConnector, IHttpFetchError<{
    message?: string;
}>, UpdateCloudConnectorRequest, unknown>;
export {};
