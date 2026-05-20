import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export interface AgentLogsData {
    agent_logs_top_errors: string[];
    fleet_server_logs_top_errors: string[];
}
export declare function getAgentLogsTopErrors(esClient?: ElasticsearchClient): Promise<AgentLogsData>;
