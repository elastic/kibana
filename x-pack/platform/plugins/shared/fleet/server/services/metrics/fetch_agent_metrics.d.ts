import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CoreSetup } from '@kbn/core/server';
import type { AgentPerVersion, AgentUsage } from '../../collectors/agent_collectors';
export interface AgentMetrics {
    agents: AgentUsage;
    agents_per_version: AgentPerVersion[];
    upgrading_step: UpgradingSteps;
    unhealthy_reason: UnhealthyReason;
}
export interface UpgradingSteps {
    requested: number;
    scheduled: number;
    downloading: number;
    extracting: number;
    replacing: number;
    restarting: number;
    watching: number;
    rollback: number;
    failed: number;
}
export interface UnhealthyReason {
    input: number;
    output: number;
    other: number;
}
export declare const fetchAgentMetrics: (core: CoreSetup, abortController: AbortController) => Promise<AgentMetrics | undefined>;
export declare const getAgentsPerVersion: (esClient: ElasticsearchClient, abortController: AbortController) => Promise<AgentPerVersion[]>;
export declare const getUpgradingSteps: (esClient: ElasticsearchClient, abortController: AbortController) => Promise<UpgradingSteps>;
export declare const getUnhealthyReason: (esClient: ElasticsearchClient, abortController: AbortController) => Promise<UnhealthyReason>;
