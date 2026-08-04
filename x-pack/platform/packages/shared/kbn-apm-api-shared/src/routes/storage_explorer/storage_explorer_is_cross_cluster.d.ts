export interface StorageExplorerIsCrossClusterResponse {
    isCrossClusterSearch: boolean;
}
export declare const storageExplorerIsCrossClusterRoute: {
    endpoint: "GET /internal/apm/storage_explorer/is_cross_cluster_search";
    params?: undefined;
} & import("../types").WithResponse<StorageExplorerIsCrossClusterResponse>;
