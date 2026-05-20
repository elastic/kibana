export interface CloudConnectorUsageItem {
    id: string;
    name: string;
    package?: {
        name: string;
        title: string;
        version: string;
    };
    policy_ids: string[];
    created_at: string;
    updated_at: string;
}
export interface CloudConnectorUsageResponse {
    items: CloudConnectorUsageItem[];
    total: number;
    page: number;
    perPage: number;
}
export interface UseCloudConnectorUsageOptions {
    staleTime?: number;
}
export declare const useCloudConnectorUsage: (cloudConnectorId: string, page?: number, perPage?: number, options?: UseCloudConnectorUsageOptions) => import("@kbn/react-query").UseQueryResult<CloudConnectorUsageResponse, unknown>;
