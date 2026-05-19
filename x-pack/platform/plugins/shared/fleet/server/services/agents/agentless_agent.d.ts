import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { AxiosResponse } from 'axios';
import type { AgentPolicy } from '../../types';
import type { AgentlessApiDeploymentResponse, AgentlessApiListDeploymentResponse } from '../../../common/types';
export interface AgentlessAgentService {
    listAgentlessDeployments(opts?: {
        perPage?: number;
        nextPageToken?: string;
    }): Promise<AgentlessApiListDeploymentResponse>;
    createAgentlessAgent(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentlessAgentPolicy: AgentPolicy): Promise<AxiosResponse<AgentlessApiDeploymentResponse> | void>;
    deleteAgentlessAgent(agentlessPolicyId: string): Promise<AxiosResponse | void>;
}
declare class AgentlessAgentServiceImpl implements AgentlessAgentService {
    getDefaultSettings(): {
        outputId: string | undefined;
        fleetServerId: string | undefined;
    };
    createAgentlessAgent(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentlessAgentPolicy: AgentPolicy): Promise<AxiosResponse<AgentlessApiDeploymentResponse, any, {}>>;
    deleteAgentlessAgent(agentlessPolicyId: string): Promise<AxiosResponse<any, any, {}>>;
    upgradeAgentlessDeployment(policyId: string): Promise<void | AxiosResponse<any, any, {}>>;
    listAgentlessDeployments(opts?: {
        perPage?: number;
        nextPageToken?: string;
    }): Promise<any>;
    private getAgentlessSecrets;
    private getHeaders;
    private getPolicyDetails;
    private getAgentlessTags;
    private withRequestIdMessage;
    private createTlsConfig;
    private getFleetUrlAndTokenForAgentlessAgent;
    private createRequestConfigDebug;
    private catchAgentlessApiError;
    private handleResponseError;
    private convertCauseErrorsToString;
    private getAgentlessAgentError;
    private getErrorHandlingMessages;
    private isErrorRetryable;
    private handleErrorsWithRetries;
    private retry;
    private hasRetryableStatusError;
    private hasRetryableCodeError;
}
export declare const agentlessAgentService: AgentlessAgentServiceImpl;
export {};
