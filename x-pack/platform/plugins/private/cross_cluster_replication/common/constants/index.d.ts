export declare const PLUGIN: {
    ID: string;
    TITLE: string;
    minimumLicenseType: "platinum";
};
export declare const MAJOR_VERSION = "8.0.0";
export declare const APPS: {
    CCR_APP: string;
    REMOTE_CLUSTER_APP: string;
};
export declare const MANAGEMENT_ID = "cross_cluster_replication";
export declare const BASE_PATH_REMOTE_CLUSTERS = "data/remote_clusters";
export declare const API_BASE_PATH = "/api/cross_cluster_replication";
export declare const API_REMOTE_CLUSTERS_BASE_PATH = "/api/remote_clusters";
export declare const API_INDEX_MANAGEMENT_BASE_PATH = "/api/index_management";
export declare const FOLLOWER_INDEX_ADVANCED_SETTINGS: {
    maxReadRequestOperationCount: number;
    maxOutstandingReadRequests: number;
    maxReadRequestSize: string;
    maxWriteRequestOperationCount: number;
    maxWriteRequestSize: string;
    maxOutstandingWriteRequests: number;
    maxWriteBufferCount: number;
    maxWriteBufferSize: string;
    maxRetryDelay: string;
    readPollTimeout: string;
};
