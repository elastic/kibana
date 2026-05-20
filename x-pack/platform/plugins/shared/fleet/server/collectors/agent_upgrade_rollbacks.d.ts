import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export interface AgentUpgradeRollbacksData {
    agent_upgrade_rollbacks: number;
}
export declare function getAgentUpgradeRollbacks(esClient?: ElasticsearchClient): Promise<AgentUpgradeRollbacksData>;
