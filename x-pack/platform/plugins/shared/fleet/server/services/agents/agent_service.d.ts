import type { ElasticsearchClient, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { AgentStatus, ListWithKuery } from '../../types';
import type { Agent, GetAgentStatusResponse } from '../../../common/types';
/**
 * A service for interacting with Agent data. See {@link AgentClient} for more information.
 *
 * @public
 */
export interface AgentService {
    /**
     * Should be used for end-user requests to Kibana. APIs will return errors if user does not have appropriate access.
     */
    asScoped(req: KibanaRequest): AgentClient;
    /**
     * Scoped services to a given space
     */
    asInternalScopedUser(spaceId: string): AgentClient;
    /**
     * Only use for server-side usages (eg. telemetry), should not be used for end users unless an explicit authz check is
     * done.
     */
    asInternalUser: AgentClient;
}
/**
 * A client for interacting with data about an Agent
 *
 * @public
 */
export interface AgentClient {
    /**
     * Get an Agent by id
     */
    getAgent(agentId: string): Promise<Agent>;
    /**
     * Get multiple agents by id
     * @param agentIds
     */
    getByIds(agentIds: string[], options?: {
        ignoreMissing?: boolean;
    }): Promise<Agent[]>;
    /**
     * Return the status by the Agent's id
     */
    getAgentStatusById(agentId: string): Promise<AgentStatus>;
    /**
     * Return the status by the Agent's Policy id
     */
    getAgentStatusForAgentPolicy(agentPolicyId?: string, filterKuery?: string): Promise<GetAgentStatusResponse['results']>;
    /**
     * List agents
     */
    listAgents(options: ListWithKuery & {
        showAgentless?: boolean;
        showInactive: boolean;
        aggregations?: Record<string, AggregationsAggregationContainer>;
        searchAfter?: SortResults;
        openPit?: boolean;
        pitId?: string;
        pitKeepAlive?: string;
        getStatusSummary?: boolean;
    }): Promise<{
        agents: Agent[];
        total: number;
        page: number;
        perPage: number;
        pit?: string;
        statusSummary?: Record<AgentStatus, number>;
        aggregations?: Record<string, estypes.AggregationsAggregate>;
    }>;
    /**
     * Return the latest agent available version
     */
    getLatestAgentAvailableVersion(includeCurrentVersion?: boolean): Promise<string>;
    /**
     * Return the latest agent available version, not taking into account IAR versions
     */
    getLatestAgentAvailableBaseVersion(includeCurrentVersion?: boolean): Promise<string>;
    /**
     * Return the latest agent available version formatted for the docker image
     */
    getLatestAgentAvailableDockerImageVersion(includeCurrentVersion?: boolean): Promise<string>;
}
/**
 * @internal
 */
declare class AgentClientImpl implements AgentClient {
    #private;
    private readonly internalEsClient;
    private readonly soClient;
    private readonly preflightCheck?;
    private readonly spaceId?;
    constructor(internalEsClient: ElasticsearchClient, soClient: SavedObjectsClientContract, preflightCheck?: (() => void | Promise<void>) | undefined, spaceId?: string | undefined);
    listAgents(options: ListWithKuery & {
        showAgentless?: boolean;
        showInactive: boolean;
        aggregations?: Record<string, AggregationsAggregationContainer>;
        searchAfter?: SortResults;
        openPit?: boolean;
        pitId?: string;
        pitKeepAlive?: string;
        getStatusSummary?: boolean;
    }): Promise<{
        agents: Agent[];
        total: number;
        page: number;
        perPage: number;
        pit?: string;
        statusSummary?: Record<AgentStatus, number>;
        aggregations?: Record<string, estypes.AggregationsAggregate>;
    }>;
    getAgent(agentId: string): Promise<Agent>;
    getByIds(agentIds: string[], options?: Partial<{
        ignoreMissing: boolean;
    }>): Promise<Agent[]>;
    getAgentStatusById(agentId: string): Promise<"offline" | "error" | "degraded" | "online" | "inactive" | "uninstalled" | "updating" | "enrolling" | "unenrolling" | "unenrolled" | "orphaned">;
    getAgentStatusForAgentPolicy(agentPolicyId?: string, filterKuery?: string): Promise<{
        all: number;
        active: number;
        other: number;
        events: number;
        total: number;
        offline: number;
        inactive: number;
        uninstalled: number;
        updating: number;
        unenrolled: number;
        orphaned: number;
        online: number;
        error: number;
    }>;
    getLatestAgentAvailableBaseVersion(includeCurrentVersion?: boolean): Promise<string>;
    getLatestAgentAvailableDockerImageVersion(includeCurrentVersion?: boolean): Promise<string>;
    getLatestAgentAvailableVersion(includeCurrentVersion?: boolean): Promise<string>;
}
/**
 * @internal
 */
export declare class AgentServiceImpl implements AgentService {
    private readonly internalEsClient;
    private readonly soClient;
    constructor(internalEsClient: ElasticsearchClient, soClient: SavedObjectsClientContract);
    asScoped(req: KibanaRequest): AgentClientImpl;
    asInternalScopedUser(spaceId: string): AgentClient;
    get asInternalUser(): AgentClientImpl;
}
export {};
