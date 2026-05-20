import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export interface AgentPanicLogsData {
    agent_logs_panics_last_hour: Array<{
        message: string;
        timestamp: string;
    }>;
}
export declare function getPanicLogsLastHour(esClient?: ElasticsearchClient): Promise<AgentPanicLogsData>;
