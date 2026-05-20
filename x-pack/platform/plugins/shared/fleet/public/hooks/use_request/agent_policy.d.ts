import type { GetAgentPoliciesRequest, GetAgentPoliciesResponse, GetOneAgentPolicyResponse, GetFullAgentPolicyResponse, CreateAgentPolicyRequest, CreateAgentPolicyResponse, UpdateAgentPolicyRequest, UpdateAgentPolicyResponse, CopyAgentPolicyRequest, CopyAgentPolicyResponse, DeleteAgentPolicyRequest, DeleteAgentPolicyResponse, BulkGetAgentPoliciesResponse, GetAgentPolicyOutputsResponse, GetListAgentPolicyOutputsResponse, GetListAgentPolicyOutputsRequest } from '../../types';
import type { RequestError } from './use_request';
export declare const useGetAgentPolicies: (query?: GetAgentPoliciesRequest["query"]) => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetAgentPoliciesResponse, RequestError>;
export declare const useGetAgentPoliciesQuery: (query?: GetAgentPoliciesRequest["query"], options?: {
    enabled?: boolean;
}) => import("@kbn/react-query").UseQueryResult<GetAgentPoliciesResponse, RequestError>;
export declare const useBulkGetAgentPoliciesQuery: (ids: string[], options?: {
    full?: boolean;
    ignoreMissing?: boolean;
    enabled?: boolean;
}) => import("@kbn/react-query").UseQueryResult<BulkGetAgentPoliciesResponse, RequestError>;
/**
 * @deprecated use sendBulkGetAgentPoliciesForRq instead
 */
export declare const sendBulkGetAgentPolicies: (ids: string[], options?: {
    full?: boolean;
    ignoreMissing?: boolean;
}) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<BulkGetAgentPoliciesResponse, RequestError>>;
export declare const sendBulkGetAgentPoliciesForRq: (ids: string[], options?: {
    full?: boolean;
    ignoreMissing?: boolean;
}) => Promise<BulkGetAgentPoliciesResponse>;
export declare const sendGetAgentPolicies: (query?: GetAgentPoliciesRequest["query"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetAgentPoliciesResponse, RequestError>>;
export declare const useGetOneAgentPolicy: (agentPolicyId: string | undefined) => {
    sendRequest: () => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetOneAgentPolicyResponse, RequestError> | undefined>;
    error: RequestError | null;
    data: GetOneAgentPolicyResponse | null;
    isLoading: boolean;
};
export declare const useGetOneAgentPolicyFull: (agentPolicyId: string, query?: {
    revision?: number;
}) => import("@kbn/react-query").UseQueryResult<GetFullAgentPolicyResponse, RequestError>;
export declare const sendGetOneAgentPolicyFull: (agentPolicyId: string, query?: {
    standalone?: boolean;
    kubernetes?: boolean;
}) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetFullAgentPolicyResponse, RequestError>>;
export declare const sendGetOneAgentPolicy: (agentPolicyId: string) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetOneAgentPolicyResponse, RequestError>>;
export declare function useGetAutoUpgradeAgentsStatusQuery(agentPolicyId: string): import("@kbn/react-query").UseQueryResult<Readonly<{} & {
    currentVersions: Readonly<{
        failedUpgradeActionIds?: string[] | undefined;
        inProgressUpgradeActionIds?: string[] | undefined;
    } & {
        version: string;
        agents: number;
        failedUpgradeAgents: number;
        inProgressUpgradeAgents: number;
    }>[];
    totalAgents: number;
}>, unknown>;
export declare const sendCreateAgentPolicyForRq: (body: CreateAgentPolicyRequest["body"], { withSysMonitoring }?: {
    withSysMonitoring: boolean;
}) => Promise<CreateAgentPolicyResponse>;
/**
 * @deprecated use sendCreateAgentPolicyForRq instead
 */
export declare const sendCreateAgentPolicy: (body: CreateAgentPolicyRequest["body"], { withSysMonitoring }?: {
    withSysMonitoring: boolean;
}) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<CreateAgentPolicyResponse, RequestError>>;
/**
 * @deprecated use sendUpdateAgentPolicyForRq instead
 */
export declare const sendUpdateAgentPolicy: (agentPolicyId: string, body: UpdateAgentPolicyRequest["body"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<UpdateAgentPolicyResponse, RequestError>>;
export declare const sendUpdateAgentPolicyForRq: (agentPolicyId: string, body: UpdateAgentPolicyRequest["body"]) => Promise<UpdateAgentPolicyResponse>;
export declare const sendCopyAgentPolicy: (agentPolicyId: string, body: CopyAgentPolicyRequest["body"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<CopyAgentPolicyResponse, RequestError>>;
export declare const sendDeleteAgentPolicy: (body: DeleteAgentPolicyRequest["body"]) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<DeleteAgentPolicyResponse, RequestError>>;
export declare const sendDeleteAgentPolicyForRq: (body: DeleteAgentPolicyRequest["body"]) => Promise<DeleteAgentPolicyResponse>;
export declare function useDeleteAgentPolicyMutation(): import("@kbn/react-query").UseMutationResult<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<DeleteAgentPolicyResponse, RequestError>, unknown, {
    agentPolicyId: string;
}, unknown>;
export declare const sendResetOnePreconfiguredAgentPolicy: (agentPolicyId: string) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, RequestError>>;
export declare const sendResetAllPreconfiguredAgentPolicies: () => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, RequestError>>;
export declare const useGetListOutputsForPolicies: (body?: GetListAgentPolicyOutputsRequest["body"]) => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetListAgentPolicyOutputsResponse, RequestError>;
export declare const useGetInfoOutputsForPolicy: (agentPolicyId: string | undefined) => import("@kbn/react-query").UseQueryResult<GetAgentPolicyOutputsResponse, unknown>;
