import type { AuthenticatedUser, ElasticsearchClient, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentPolicy, NewAgentPolicy } from '../types';
import { type AgentPolicyServiceInterface } from '.';
interface CreateAgentPolicyParams {
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    agentPolicyService: AgentPolicyServiceInterface;
    newPolicy: NewAgentPolicy;
    hasFleetServer?: boolean;
    withSysMonitoring: boolean;
    monitoringEnabled?: string[];
    spaceId: string;
    user?: AuthenticatedUser;
    /** Pass force to all following calls: package install, policy creation */
    force?: boolean;
    /** Pass force only to package policy creation */
    forcePackagePolicyCreation?: boolean;
    request?: KibanaRequest;
}
export declare function createAgentPolicyWithPackages({ soClient, esClient, agentPolicyService, newPolicy, hasFleetServer, withSysMonitoring: withSysMonitoringParams, monitoringEnabled: monitoringEnabledParams, spaceId, user, request, force, forcePackagePolicyCreation, }: CreateAgentPolicyParams): Promise<AgentPolicy>;
export {};
