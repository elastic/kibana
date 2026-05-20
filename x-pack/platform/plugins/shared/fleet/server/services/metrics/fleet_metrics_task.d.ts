import type { TaskManagerStartContract, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AgentMetrics } from './fetch_agent_metrics';
export declare const TYPE = "Fleet-Metrics-Task";
export declare const VERSION = "1.1.1";
export declare class FleetMetricsTask {
    private taskManager?;
    private wasStarted;
    private esClient?;
    constructor(taskManager: TaskManagerSetupContract, fetchAgentMetrics: (abortController: AbortController) => Promise<AgentMetrics | undefined>);
    private runTask;
    private get taskId();
    start(taskManager: TaskManagerStartContract, esClient: ElasticsearchClient): Promise<void>;
}
