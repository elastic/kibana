import type { GetCategoriesRequest, GetCategoriesResponse, GetPackagesRequest, GetPackagesResponse, GetLimitedPackagesResponse, GetInfoResponse, InstallPackageResponse, DeletePackageRequest, DeletePackageResponse, UpdatePackageRequest, UpdatePackageResponse, ReviewUpgradeResponse, GetBulkAssetsRequest, GetBulkAssetsResponse, GetVerificationKeyIdResponse, GetInputsTemplatesRequest, GetInputsTemplatesResponse } from '../../types';
import type { BulkUpgradePackagesRequest, BulkOperationPackagesResponse, FleetErrorResponse, GetEpmDataStreamsResponse, GetOneBulkOperationPackagesResponse, GetStatsResponse, GetDependenciesResponse, BulkUninstallPackagesRequest, DeletePackageDatastreamAssetsRequest, DeletePackageDatastreamAssetsResponse, BulkRollbackPackagesRequest } from '../../../common/types';
import type { RequestError } from './use_request';
export declare function useGetAppendCustomIntegrationsQuery(): import("@kbn/react-query").UseQueryResult<import("@kbn/custom-integrations-plugin/common").CustomIntegration[], unknown>;
export declare function useGetReplacementCustomIntegrationsQuery(): import("@kbn/react-query").UseQueryResult<import("@kbn/custom-integrations-plugin/common").CustomIntegration[], unknown>;
export declare function useGetCategoriesQuery(query?: GetCategoriesRequest['query']): import("@kbn/react-query").UseQueryResult<GetCategoriesResponse, RequestError>;
export declare const sendGetCategories: (query?: GetCategoriesRequest["query"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetCategoriesResponse, RequestError>>;
export declare const useGetPackages: (query?: GetPackagesRequest["query"]) => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetPackagesResponse, RequestError>;
export declare const useGetPackagesQuery: (query: GetPackagesRequest["query"], options?: {
    enabled?: boolean;
}) => import("@kbn/react-query").UseQueryResult<GetPackagesResponse, RequestError>;
export declare const sendGetPackages: (query?: GetPackagesRequest["query"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetPackagesResponse, RequestError>>;
export declare const useGetLimitedPackages: () => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetLimitedPackagesResponse, RequestError>;
export declare const useUpdateCustomIntegration: (id: string, fields: {
    readMeData: string | undefined;
    categories: string[];
}) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, RequestError>>;
export declare const useGetPackageInfoByKeyQuery: (pkgName: string, pkgVersion?: string, options?: {
    ignoreUnverified?: boolean;
    prerelease?: boolean;
    full?: boolean;
    withMetadata?: boolean;
}, queryOptions?: {
    enabled?: boolean;
    suspense?: boolean;
    refetchOnMount?: boolean | "always";
}) => import("@kbn/react-query").UseQueryResult<GetInfoResponse, RequestError>;
export declare const useGetPackageStats: (pkgName: string) => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetStatsResponse, RequestError>;
export declare const useGetPackageDependencies: (pkgName: string, pkgVersion: string, { enabled }?: {
    enabled?: boolean;
}) => import("@kbn/react-query").UseQueryResult<GetDependenciesResponse, RequestError>;
export declare const useGetPackageVerificationKeyId: () => {
    error: RequestError;
    isError: true;
    isLoading: false;
    isLoadingError: false;
    isRefetchError: true;
    isSuccess: false;
    status: "error";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: RequestError | null;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<GetVerificationKeyIdResponse, RequestError>>;
    remove: () => void;
    fetchStatus: import("@kbn/react-query").FetchStatus;
    packageVerificationKeyId: string | undefined;
} | {
    error: null;
    isError: false;
    isLoading: false;
    isLoadingError: false;
    isRefetchError: false;
    isSuccess: true;
    status: "success";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: RequestError | null;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<GetVerificationKeyIdResponse, RequestError>>;
    remove: () => void;
    fetchStatus: import("@kbn/react-query").FetchStatus;
    packageVerificationKeyId: string | undefined;
} | {
    error: RequestError;
    isError: true;
    isLoading: false;
    isLoadingError: true;
    isRefetchError: false;
    isSuccess: false;
    status: "error";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: RequestError | null;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<GetVerificationKeyIdResponse, RequestError>>;
    remove: () => void;
    fetchStatus: import("@kbn/react-query").FetchStatus;
    packageVerificationKeyId: string | undefined;
} | {
    error: null;
    isError: false;
    isLoading: true;
    isLoadingError: false;
    isRefetchError: false;
    isSuccess: false;
    status: "loading";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: RequestError | null;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<GetVerificationKeyIdResponse, RequestError>>;
    remove: () => void;
    fetchStatus: import("@kbn/react-query").FetchStatus;
    packageVerificationKeyId: string | undefined;
};
/**
 * @deprecated use sendGetPackageInfoByKeyForRq instead
 */
export declare const sendGetPackageInfoByKey: (pkgName: string, pkgVersion?: string, options?: {
    ignoreUnverified?: boolean;
    prerelease?: boolean;
    full?: boolean;
}) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetInfoResponse, RequestError>>;
export declare const sendGetPackageInfoByKeyForRq: (pkgName: string, pkgVersion?: string, options?: {
    ignoreUnverified?: boolean;
    prerelease?: boolean;
    full?: boolean;
}) => Promise<GetInfoResponse>;
export declare const useGetFileByPath: (filePath: string) => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<string, RequestError>;
export declare const useGetFileByPathQuery: (filePath: string) => import("@kbn/react-query").UseQueryResult<string, RequestError>;
export declare const useGetEpmDatastreams: () => import("@kbn/react-query").UseQueryResult<GetEpmDataStreamsResponse, RequestError>;
export declare const sendGetFileByPath: (filePath: string) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<string, RequestError>>;
export declare const sendInstallPackage: (pkgName: string, pkgVersion: string, force?: boolean) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<InstallPackageResponse, FleetErrorResponse>>;
export declare const sendBulkInstallPackages: (packages: Array<string | {
    name: string;
    version: string;
}>) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<InstallPackageResponse, FleetErrorResponse>>;
export declare const sendBulkUpgradePackagesForRq: (params: BulkUpgradePackagesRequest) => Promise<BulkOperationPackagesResponse>;
export declare const sendBulkUninstallPackagesForRq: (params: BulkUninstallPackagesRequest) => Promise<BulkOperationPackagesResponse>;
export declare const sendGetOneBulkUpgradePackagesForRq: (taskId: string) => Promise<GetOneBulkOperationPackagesResponse>;
export declare const sendGetOneBulkUninstallPackagesForRq: (taskId: string) => Promise<GetOneBulkOperationPackagesResponse>;
export declare const sendBulkRollbackPackagesForRq: (params: BulkRollbackPackagesRequest) => Promise<BulkOperationPackagesResponse>;
export declare const sendGetBulkRollbackInfoPackagesForRq: (taskId: string) => Promise<GetOneBulkOperationPackagesResponse>;
export declare const useGetRollbackAvailableCheck: (pkgName: string) => Readonly<{
    reason?: string | undefined;
} & {
    isAvailable: boolean;
}>;
export declare const useGetBulkRollbackAvailableCheck: () => Record<string, Readonly<{
    reason?: string | undefined;
} & {
    isAvailable: boolean;
}>>;
/**
 * @deprecated use sendRemovePackageForRq instead
 */
export declare function sendRemovePackage({ pkgName, pkgVersion }: DeletePackageRequest['params'], query?: DeletePackageRequest['query']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<DeletePackageResponse, RequestError>>;
export declare function sendRemovePackageForRq({ pkgName, pkgVersion }: DeletePackageRequest['params'], query?: DeletePackageRequest['query']): Promise<DeletePackageResponse>;
export declare const sendRequestReauthorizeTransforms: (pkgName: string, pkgVersion: string, transforms: Array<{
    transformId: string;
}>) => Promise<InstallPackageResponse>;
export declare const sendRequestInstallRuleAssets: (pkgName: string, pkgVersion: string) => Promise<InstallPackageResponse>;
interface UpdatePackageArgs {
    pkgName: string;
    pkgVersion: string;
    body: UpdatePackageRequest['body'];
}
interface InstallKibanaAssetsArgs {
    pkgName: string;
    pkgVersion: string;
    spaceIds?: string[];
}
export declare const useUpdatePackageMutation: () => import("@kbn/react-query").UseMutationResult<UpdatePackageResponse, RequestError, UpdatePackageArgs, unknown>;
interface ReviewUpgradeArgs {
    pkgName: string;
    action: 'accept' | 'decline' | 'pending';
    targetVersion: string;
}
export declare const useReviewUpgradeMutation: () => import("@kbn/react-query").UseMutationResult<ReviewUpgradeResponse, RequestError, ReviewUpgradeArgs, unknown>;
export declare const useInstallKibanaAssetsMutation: () => import("@kbn/react-query").UseMutationResult<any, RequestError, InstallKibanaAssetsArgs, unknown>;
export declare const sendInstallKibanaAssetsForRq: ({ pkgName, pkgVersion, spaceIds, }: InstallKibanaAssetsArgs) => Promise<any>;
export declare const sendUpdatePackage: (pkgName: string, pkgVersion: string, body: UpdatePackageRequest["body"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<UpdatePackageResponse, RequestError>>;
export declare const sendGetBulkAssets: (body: GetBulkAssetsRequest["body"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetBulkAssetsResponse, RequestError>>;
export declare const sendDeletePackageDatastreamAssets: ({ pkgName, pkgVersion }: DeletePackageDatastreamAssetsRequest["params"], query: DeletePackageDatastreamAssetsRequest["query"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<DeletePackageDatastreamAssetsResponse, RequestError>>;
export declare function useGetInputsTemplatesQuery({ pkgName, pkgVersion }: GetInputsTemplatesRequest['params'], query: GetInputsTemplatesRequest['query']): import("@kbn/react-query").UseQueryResult<GetInputsTemplatesResponse, RequestError>;
export {};
