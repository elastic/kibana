import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
export interface AgentStatus {
    healthy: number;
    unhealthy: number;
    offline: number;
    inactive: number;
    unenrolled: number;
    updating: number;
}
export interface AgentUsage extends AgentStatus {
    total_enrolled: number;
    total_all_statuses: number;
}
export declare const getAgentUsage: (soClient?: SavedObjectsClientContract, esClient?: ElasticsearchClient, onlyAgentless?: boolean) => Promise<AgentUsage>;
export interface AgentPerVersion {
    version: string;
    count: number;
}
export interface AgentData {
    agents_per_version: Array<AgentPerVersion & AgentStatus>;
    agent_checkin_status: {
        error: number;
        degraded: number;
    };
    agents_per_privileges: {
        root: number;
        unprivileged: number;
    };
    agents_per_policy: number[];
    agents_per_os: Array<{
        name: string;
        version: string;
        count: number;
    }>;
    upgrade_details: Array<{
        target_version: string;
        state: string;
        error_msg: string;
        agent_count: number;
    }>;
}
export declare const getAgentData: (esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, abortController: AbortController) => Promise<AgentData>;
