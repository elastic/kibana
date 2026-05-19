import { type CoreSetup } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LoggerFactory } from '@kbn/core/server';
export declare const TYPE = "fleet:policy-revisions-cleanup-task";
export declare const VERSION = "1.0.0";
interface FleetPolicyRevisionsCleanupTaskConfig {
    maxRevisions?: number;
    interval?: string;
    maxPoliciesPerRun?: number;
}
interface FleetPolicyRevisionsCleanupTaskSetupContract {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    logFactory: LoggerFactory;
    config: FleetPolicyRevisionsCleanupTaskConfig;
}
interface FleetPolicyRevisionsCleanupTaskStartContract {
    taskManager: TaskManagerStartContract;
}
export declare class FleetPolicyRevisionsCleanupTask {
    private logger;
    private wasStarted;
    private taskInterval;
    private maxRevisions;
    private maxPoliciesPerRun;
    constructor(setupContract: FleetPolicyRevisionsCleanupTaskSetupContract);
    start: ({ taskManager }: FleetPolicyRevisionsCleanupTaskStartContract) => Promise<void>;
    private get taskId();
    private endRun;
    runTask: (taskInstance: ConcreteTaskInstance, core: CoreSetup, abortController: AbortController) => Promise<{
        state: {};
        shouldDeleteTask: boolean;
    } | undefined>;
}
export {};
