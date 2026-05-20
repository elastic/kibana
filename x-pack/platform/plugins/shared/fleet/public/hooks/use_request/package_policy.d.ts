import type { CreatePackagePolicyRequest, CreatePackagePolicyResponse, UpdatePackagePolicyRequest } from '../../types';
import type { DeletePackagePoliciesRequest, PostDeletePackagePoliciesResponse, GetPackagePoliciesRequest, GetPackagePoliciesResponse, GetOnePackagePolicyResponse, UpgradePackagePolicyDryRunResponse, UpgradePackagePolicyResponse } from '../../../common/types/rest_spec';
import type { RequestError } from './use_request';
/**
 * @deprecated use sendCreatePackagePolicyForRq instead
 */
export declare const sendCreatePackagePolicy: (body: CreatePackagePolicyRequest["body"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<CreatePackagePolicyResponse, RequestError>>;
export declare const sendCreatePackagePolicyForRq: (body: CreatePackagePolicyRequest["body"]) => Promise<CreatePackagePolicyResponse>;
export declare const sendUpdatePackagePolicy: (packagePolicyId: string, body: UpdatePackagePolicyRequest["body"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<CreatePackagePolicyResponse, RequestError>>;
export declare const sendDeletePackagePolicy: (body: DeletePackagePoliciesRequest["body"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PostDeletePackagePoliciesResponse, RequestError>>;
export declare function useDeletePackagePolicyMutation(): import("@kbn/react-query").UseMutationResult<PostDeletePackagePoliciesResponse, unknown, {
    packagePolicyIds: string[];
    force?: boolean;
}, unknown>;
export declare function useGetPackagePoliciesQuery(query: GetPackagePoliciesRequest['query'], options?: Partial<{
    enabled: boolean;
}>): import("@kbn/react-query").UseQueryResult<GetPackagePoliciesResponse, RequestError>;
export declare function useGetPackagePolicies(query: GetPackagePoliciesRequest['query']): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetPackagePoliciesResponse, RequestError>;
export declare const sendGetPackagePolicies: (query: GetPackagePoliciesRequest["query"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetPackagePoliciesResponse, RequestError>>;
export declare const useGetOnePackagePolicyQuery: (packagePolicyId: string) => import("@kbn/react-query").UseQueryResult<GetOnePackagePolicyResponse, RequestError>;
export declare const useGetOnePackagePolicy: (packagePolicyId: string) => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetOnePackagePolicyResponse, RequestError>;
export declare const sendGetOnePackagePolicy: (packagePolicyId: string) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetOnePackagePolicyResponse, RequestError>>;
export declare function useUpgradePackagePolicyDryRunQuery(packagePolicyIds: string[], packageVersion?: string, { enabled }?: Partial<{
    enabled: boolean;
}>): import("@kbn/react-query").UseQueryResult<UpgradePackagePolicyDryRunResponse, RequestError>;
export declare function sendUpgradePackagePolicyDryRun(packagePolicyIds: string[], packageVersion?: string): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<UpgradePackagePolicyDryRunResponse, RequestError>>;
export declare function useUpgradePackagePoliciesMutation(): import("@kbn/react-query").UseMutationResult<UpgradePackagePolicyDryRunResponse, RequestError, {
    packagePolicyIds: string[];
}, unknown>;
export declare function sendUpgradePackagePolicy(packagePolicyIds: string[]): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<UpgradePackagePolicyResponse, RequestError>>;
export declare function sendGetOrphanedIntegrationPolicies(): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, RequestError>>;
