export interface StorageExplorerPrivilegesResponse {
    hasPrivileges: boolean;
}
export declare const storageExplorerPrivilegesRoute: {
    endpoint: "GET /internal/apm/storage_explorer/privileges";
    params?: undefined;
} & import("../types").WithResponse<StorageExplorerPrivilegesResponse>;
