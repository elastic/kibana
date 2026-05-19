import { type CoreSetup } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LoggerFactory } from '@kbn/core/server';
import { type estypes } from '@elastic/elasticsearch';
export declare const TYPE = "fleet:agent-status-change-task";
export declare const VERSION = "1.0.2";
export declare const HAS_CHANGED_RUNTIME_FIELD: estypes.SearchRequest['runtime_mappings'];
interface AgentStatusChangeTaskConfig {
    taskInterval?: string;
}
interface AgentStatusChangeTaskSetupContract {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    logFactory: LoggerFactory;
    config: AgentStatusChangeTaskConfig;
}
interface AgentStatusChangeTaskStartContract {
    taskManager: TaskManagerStartContract;
}
export declare class AgentStatusChangeTask {
    private logger;
    private wasStarted;
    private taskInterval;
    constructor(setupContract: AgentStatusChangeTaskSetupContract);
    start: ({ taskManager }: AgentStatusChangeTaskStartContract) => Promise<void>;
    private get taskId();
    private endRun;
    runTask: (taskInstance: ConcreteTaskInstance, core: CoreSetup, abortController: AbortController) => Promise<{
        state: {};
        shouldDeleteTask: boolean;
    } | undefined>;
    private persistAgentStatusChanges;
    private findAgentlessPolicies;
    private bulkCreateAgentStatusChangeDocs;
}
export {};
