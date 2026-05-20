import { type CoreSetup } from '@kbn/core/server';
import type { LoggerFactory } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { type ConcreteTaskInstance, type TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
export declare const UPGRADE_AGENTLESS_DEPLOYMENTS_TASK_TYPE = "fleet:upgrade-agentless-deployments-task";
export declare const UPGRADE_AGENT_DEPLOYMENTS_TASK_VERSION = "1.0.0";
interface UpgradeAgentlessDeploymentsTaskSetupContract {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    logFactory: LoggerFactory;
}
interface UpgradeAgentlessDeploymentsTaskStartContract {
    taskManager: TaskManagerStartContract;
}
export declare class UpgradeAgentlessDeploymentsTask {
    private logger;
    private startedTaskRunner;
    constructor(setupContract: UpgradeAgentlessDeploymentsTaskSetupContract);
    start: ({ taskManager }: UpgradeAgentlessDeploymentsTaskStartContract) => Promise<void>;
    private get taskId();
    private endRun;
    private processInBatches;
    private processUpgradeAgentlessDeployments;
    private upgradeAgentlessDeployments;
    runTask: (taskInstance: ConcreteTaskInstance, core: CoreSetup, abortController: AbortController) => Promise<{
        state: {};
        shouldDeleteTask: boolean;
    } | undefined>;
}
export {};
