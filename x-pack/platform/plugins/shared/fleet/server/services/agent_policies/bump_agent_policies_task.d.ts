import type { Logger } from '@kbn/core/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export declare function registerBumpAgentPoliciesTask(taskManagerSetup: TaskManagerSetupContract): void;
export declare function _updatePackagePoliciesThatNeedBump(logger: Logger, isCancelled: () => boolean): Promise<void>;
export declare function scheduleBumpAgentPoliciesTask(taskManagerStart: TaskManagerStartContract): Promise<void>;
