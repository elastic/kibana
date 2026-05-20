import type { CloudInfo } from '@kbn/ml-common-types/ml_server_info';
export declare function useMlNodeAvailableCheck(): {
    mlNodesAvailable: boolean;
    isCloud: boolean;
    deploymentId: string | null;
    isCloudTrial: boolean;
};
export declare function useMlNodeCheck(): {
    mlNodeCount: number | null;
    lazyMlNodeCount: number | null;
    userHasPermissionToViewMlNodeCount: boolean | null;
    mlNodesAvailable: boolean;
    refresh: () => Promise<void>;
};
export declare function useCloudCheck(): CloudInfo;
