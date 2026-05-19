import type { CoreSetup, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LoggerFactory } from '@kbn/core/server';
import type { AgentPolicy } from '../types';
export declare const TYPE = "fleet:unenroll-inactive-agents-task";
export declare const VERSION = "1.0.3";
interface UnenrollInactiveAgentsTaskConfig {
    taskInterval?: string;
}
interface UnenrollInactiveAgentsTaskSetupContract {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    logFactory: LoggerFactory;
    unenrollBatchSize?: number;
    config: UnenrollInactiveAgentsTaskConfig;
}
interface UnenrollInactiveAgentsTaskStartContract {
    taskManager: TaskManagerStartContract;
}
export declare class UnenrollInactiveAgentsTask {
    private logger;
    private wasStarted;
    private unenrollBatchSize;
    private taskInterval;
    constructor(setupContract: UnenrollInactiveAgentsTaskSetupContract);
    start: ({ taskManager }: UnenrollInactiveAgentsTaskStartContract) => Promise<void>;
    private get taskId();
    getAgentsQuery(agentPolicies: AgentPolicy[]): string;
    private endRun;
    unenrollInactiveAgents(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract): Promise<void>;
    runTask: (taskInstance: ConcreteTaskInstance, core: CoreSetup) => Promise<{
        state: {};
        shouldDeleteTask: boolean;
    } | undefined>;
}
export {};
