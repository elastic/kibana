import type { GetActionStatusRequest, GetActionStatusResponse, GetAgentTagsResponse, GetAgentUploadsResponse, GetOneAgentRequest, PostBulkUpdateAgentTagsRequest, PostRequestBulkDiagnosticsRequest, PostRequestDiagnosticsRequest, DeleteAgentUploadResponse, UpdateAgentRequest, MigrateSingleAgentRequest, MigrateSingleAgentResponse, BulkMigrateAgentsRequest, BulkMigrateAgentsResponse, ChangeAgentPrivilegeLevelRequest, ChangeAgentPrivilegeLevelResponse, BulkChangeAgentPrivilegeLevelRequest, BulkChangeAgentPrivilegeLevelResponse, PostAgentRollbackResponse, PostBulkAgentRollbackRequest, PostBulkAgentRollbackResponse, PostGenerateAgentsReportRequest, PostGenerateAgentsReportResponse } from '../../../common/types';
import type { GetOneAgentResponse, PostAgentUnenrollRequest, PostBulkAgentUnenrollRequest, PostAgentUnenrollResponse, PostBulkRemoveCollectorsRequest, PostRemoveCollectorResponse, PostAgentReassignRequest, PostAgentReassignResponse, PostBulkAgentReassignRequest, GetAgentsRequest, GetAgentsResponse, GetAgentStatusRequest, GetAgentStatusResponse, GetAgentIncomingDataRequest, GetAgentIncomingDataResponse, PostAgentUpgradeRequest, PostBulkAgentUpgradeRequest, PostAgentUpgradeResponse, PostNewAgentActionRequest, PostNewAgentActionResponse, GetCurrentUpgradesResponse, GetAvailableVersionsResponse, PostRetrieveAgentsByActionsRequest, PostRetrieveAgentsByActionsResponse } from '../../types';
import type { UseRequestConfig } from './use_request';
type RequestOptions = Pick<Partial<UseRequestConfig>, 'pollIntervalMs'>;
export declare function useGetOneAgent(agentId: string, options?: RequestOptions & {
    query?: GetOneAgentRequest['query'];
}): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetOneAgentResponse, import("./use_request").RequestError>;
export declare function useGetAgents(query: GetAgentsRequest['query'], options?: RequestOptions): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetAgentsResponse, import("./use_request").RequestError>;
export declare function useGetAgentsQuery(query: GetAgentsRequest['query'], options?: Partial<{
    enabled: boolean;
    refetchInterval: number | false;
    keepPreviousData: boolean;
}>): import("@kbn/react-query").UseQueryResult<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetAgentsResponse, import("./use_request").RequestError>, unknown>;
export declare function useGetAgentEffectiveConfigQuery(agentId: string): import("@kbn/react-query").UseQueryResult<any, unknown>;
/**
 * @deprecated use sendGetAgentsForRq or useGetAgentsQuery instead
 */
export declare function sendGetAgents(query: GetAgentsRequest['query'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetAgentsResponse, import("./use_request").RequestError>>;
export declare function sendGetAgentsForRq(query: GetAgentsRequest['query'], options?: RequestOptions): Promise<GetAgentsResponse>;
export declare function useGetAgentStatus(query: GetAgentStatusRequest['query'], options?: RequestOptions): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetAgentStatusResponse, import("./use_request").RequestError>;
export declare function sendGetAgentIncomingData(query: GetAgentIncomingDataRequest['query']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetAgentIncomingDataResponse, import("./use_request").RequestError>>;
export declare function sendGetAgentStatus(query: GetAgentStatusRequest['query'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetAgentStatusResponse, import("./use_request").RequestError>>;
export declare function sendGetAgentTagsForRq(query: GetAgentsRequest['query'], options?: RequestOptions): Promise<GetAgentTagsResponse>;
export declare function sendPostAgentReassign(agentId: string, body: PostAgentReassignRequest['body'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PostAgentReassignResponse, import("./use_request").RequestError>>;
export declare function sendPostBulkAgentReassign(body: PostBulkAgentReassignRequest['body'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<import("../../../common/types").BulkAgentAction, import("./use_request").RequestError>>;
export declare function sendPostAgentUnenroll(agentId: string, body: PostAgentUnenrollRequest['body'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PostAgentUnenrollResponse, import("./use_request").RequestError>>;
export declare function sendPostBulkAgentUnenroll(body: PostBulkAgentUnenrollRequest['body'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<import("../../../common/types").BulkAgentAction, import("./use_request").RequestError>>;
export declare function sendPostRemoveCollector(agentId: string): Promise<PostRemoveCollectorResponse>;
export declare function sendPostBulkRemoveCollectors(body: PostBulkRemoveCollectorsRequest['body']): Promise<import("../../../common/types").BulkAgentAction>;
export declare function sendPostAgentUpgrade(agentId: string, body: PostAgentUpgradeRequest['body'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PostAgentUpgradeResponse, import("./use_request").RequestError>>;
export declare function sendPostRequestDiagnostics(agentId: string, body: PostRequestDiagnosticsRequest['body'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<import("../../../common/types").BulkAgentAction, import("./use_request").RequestError>>;
export declare function sendPostBulkRequestDiagnostics(body: PostRequestBulkDiagnosticsRequest['body'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<import("../../../common/types").BulkAgentAction, import("./use_request").RequestError>>;
export declare function sendGetAgentUploads(agentId: string, options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetAgentUploadsResponse, import("./use_request").RequestError>>;
export declare function sendDeleteAgentUpload(fileId: string, options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<DeleteAgentUploadResponse, import("./use_request").RequestError>>;
export declare const useGetAgentUploads: (agentId: string, options?: RequestOptions) => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetAgentUploadsResponse, import("./use_request").RequestError>;
export declare function sendPostAgentAction(agentId: string, body: PostNewAgentActionRequest['body'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PostNewAgentActionResponse, import("./use_request").RequestError>>;
export declare function sendPostBulkAgentUpgrade(body: PostBulkAgentUpgradeRequest['body'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<import("../../../common/types").BulkAgentAction, import("./use_request").RequestError>>;
export declare function sendGetActionStatus(query?: GetActionStatusRequest['query']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetActionStatusResponse, import("./use_request").RequestError>>;
export declare function sendPostCancelAction(actionId: string): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetCurrentUpgradesResponse, import("./use_request").RequestError>>;
export declare function sendPostRetrieveAgentsByActions(body: PostRetrieveAgentsByActionsRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PostRetrieveAgentsByActionsResponse, import("./use_request").RequestError>>;
export declare function sendPutAgentTagsUpdate(agentId: string, body: UpdateAgentRequest['body'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetOneAgentResponse, import("./use_request").RequestError>>;
export declare function sendPostBulkAgentTagsUpdate(body: PostBulkUpdateAgentTagsRequest['body'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetOneAgentResponse, import("./use_request").RequestError>>;
export declare function sendGetAgentsAvailableVersions(): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetAvailableVersionsResponse, import("./use_request").RequestError>>;
export declare function useGetAgentsAvailableVersionsQuery(options?: Partial<{
    enabled: boolean;
}>): import("@kbn/react-query").UseQueryResult<GetAvailableVersionsResponse, unknown>;
export declare function sendGetAgentStatusRuntimeField(): Promise<string>;
export declare function useGetAgentStatusRuntimeFieldQuery(options?: Partial<{
    enabled: boolean;
}>): import("@kbn/react-query").UseQueryResult<string, unknown>;
export declare function sendMigrateSingleAgent(options: MigrateSingleAgentRequest['body']): Promise<MigrateSingleAgentResponse>;
export declare function sendBulkMigrateAgents(options: BulkMigrateAgentsRequest['body']): Promise<BulkMigrateAgentsResponse>;
export declare function sendChangeAgentPrivilegeLevel(request: ChangeAgentPrivilegeLevelRequest): Promise<ChangeAgentPrivilegeLevelResponse>;
export declare function sendBulkChangeAgentPrivilegeLevel(request: BulkChangeAgentPrivilegeLevelRequest): Promise<BulkChangeAgentPrivilegeLevelResponse>;
export declare function sendPostAgentRollback(agentId: string): Promise<PostAgentRollbackResponse>;
export declare function sendPostBulkAgentRollback(body: PostBulkAgentRollbackRequest['body']): Promise<PostBulkAgentRollbackResponse>;
export declare function sendPostGenerateAgentsReport(body: PostGenerateAgentsReportRequest['body']): Promise<PostGenerateAgentsReportResponse>;
export {};
